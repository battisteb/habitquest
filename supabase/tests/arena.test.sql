-- Arenas (ADR 012). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(23);

-- Balance
select is(arena_attack_power(0, 1, 0), 102, 'attack with no habit only counts the stats');
select is(arena_attack_power(9, 1, 50), 100 + 150 + 2 + 90, 'habits are capped at 5, streak at 30');
select is(arena_defense_power(5, 1, 0), 177, 'habits count half in defense');
select is(arena_season_start(1), date '2026-10-08', 'seasons last 10 days');
select is(arena_season_for(date '2026-10-07'), 0, 'last day of season 0');
select is(arena_season_for(date '2026-10-08'), 1, 'first day of season 1');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000aa001', 'champ@test.dev', '{"username":"champ"}'),
  ('00000000-0000-0000-0000-0000000aa002', 'rookie@test.dev', '{"username":"rookie"}'),
  ('00000000-0000-0000-0000-0000000aa003', 'buddy@test.dev', '{"username":"buddy"}');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

-- A finished season: champ alone in a Silver group, 5 habits on day 0 only.
create temp table past on commit drop as
  select arena_season_for(current_date) - 1 as season,
         arena_season_start(arena_season_for(current_date) - 1) as start_on;
insert into arena_groups (id, season, tier)
  select '00000000-0000-0000-0000-00000000a0a1', season, 2 from past;
insert into arena_members (group_id, slot, user_id, season, joined_on)
  select '00000000-0000-0000-0000-00000000a0a1', 0, '00000000-0000-0000-0000-0000000aa001', season, start_on
  from past;
insert into arena_players (user_id, tier, last_group_id)
  values ('00000000-0000-0000-0000-0000000aa001', 2, '00000000-0000-0000-0000-00000000a0a1');
insert into habits (id, user_id, name, category, frequency)
  values ('00000000-0000-0000-0000-00000000a0b1', '00000000-0000-0000-0000-0000000aa001',
          'Read', 'learning', 'daily');
insert into completions (habit_id, completed_at)
  select '00000000-0000-0000-0000-00000000a0b1', start_on + time '12:00'
  from past, generate_series(1, 5);

select arena_resolve_group('00000000-0000-0000-0000-00000000a0a1');
select is((select count(*)::int from arena_fights where group_id = '00000000-0000-0000-0000-00000000a0a1'),
  110, 'every slot attacks every other slot once over a season');
select ok((select won and points = 3 and gold = 10 and attacker_habits = 5 and defender_is_bot
           from arena_fights where group_id = '00000000-0000-0000-0000-00000000a0a1'
             and day = 0 and attacker_slot = 0),
  '5 habits beat a Silver bot, for 3 points and 10 gold');
select is((select sum(points)::int from arena_fights
           where attacker_id = '00000000-0000-0000-0000-0000000aa001'), 3,
  'a day without habits scores nothing, but costs nothing either');
select is((select gold from profiles where id = '00000000-0000-0000-0000-0000000aa001'), 10,
  'the win paid 10 gold');

select arena_resolve_group('00000000-0000-0000-0000-00000000a0a1');
select is((select gold from profiles where id = '00000000-0000-0000-0000-0000000aa001'), 10,
  'resolving twice changes nothing');

-- Champ wins every attack of the season -> top of the table.
insert into completions (habit_id, completed_at)
  select '00000000-0000-0000-0000-00000000a0b1', start_on + d + time '12:00'
  from past, generate_series(1, 9) d, generate_series(1, 5);
delete from arena_fights where group_id = '00000000-0000-0000-0000-00000000a0a1';
select arena_resolve_group('00000000-0000-0000-0000-00000000a0a1');
select is((select place from arena_standings('00000000-0000-0000-0000-00000000a0a1')
           where user_id = '00000000-0000-0000-0000-0000000aa001'), 1, 'daily habits all season win the group');

-- Opening the arena in the new season settles the old one: promoted to Gold.
select pg_temp.act_as('00000000-0000-0000-0000-0000000aa001');
set local role authenticated;
create temp table champ on commit drop as select arena_state() as s;
select is((select (s -> 'last_result' ->> 'to_tier')::int from champ), 3, 'the top 3 go up a league');
select is((select (s ->> 'tier')::int from champ), 3, 'the new season is played in Gold');
select is((select json_array_length(s -> 'standings') from champ), 11, 'a group always has 11 players');
select is((select count(*)::int from json_array_elements((select s -> 'standings' from champ)) e
           where (e ->> 'is_bot')::boolean), 10, 'empty seats are flagged bots');
select arena_ack_result();
select ok((arena_state() -> 'last_result') is null or json_typeof(arena_state() -> 'last_result') = 'null',
  'the promotion banner is shown once');

-- New players start in Bronze and share a group.
select pg_temp.act_as('00000000-0000-0000-0000-0000000aa002');
select is((arena_state() ->> 'tier')::int, 1, 'new players start in Bronze');
select pg_temp.act_as('00000000-0000-0000-0000-0000000aa003');
select ok(exists(select 1 from json_array_elements(arena_state() -> 'standings') e
           where e ->> 'username' = 'rookie'), 'the next Bronze player joins the same group');
select is((arena_state() -> 'today' -> 'opponent' ->> 'username') is not null, true,
  'there is an opponent to attack today');

-- Clients cannot touch the tables or resolve fights themselves.
select throws_ok('select count(*) from arena_fights', '42501', null, 'fights are not readable directly');
select throws_ok($$select arena_resolve_group('00000000-0000-0000-0000-00000000a0a1')$$, '42501', null,
  'resolution is server-only');

reset role;
set local role anon;
select throws_ok('select arena_state()', '42501', null, 'anonymous users have no arena');

reset role;
select * from finish();
rollback;
