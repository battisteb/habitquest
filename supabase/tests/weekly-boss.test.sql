-- Weekly boss (I9, migration 20261003220000). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000b0551', 'slayer@test.dev', '{"username":"slayer"}');
update profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000b0551';
-- One daily quest: 7 planned validations, 56 HP.
insert into habits (id, user_id, name, frequency) values
  ('00000000-0000-0000-0000-0000000b0a01', '00000000-0000-0000-0000-0000000b0551', 'Read', 'daily');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select ok(weekly_boss_key(date '2026-01-05') <> weekly_boss_key(date '2026-01-12'), 'a new boss every week');
select is(weekly_boss_key(date '2026-01-05'), weekly_boss_key(date '2026-02-02'), 'four bosses in rotation');

select pg_temp.act_as('00000000-0000-0000-0000-0000000b0551');
set local role authenticated;
create temp table b0 on commit drop as select get_weekly_boss() as b;
grant select on b0 to authenticated;
select is((select (b ->> 'hp_max')::int from b0), 56, 'HP: 8 per quest planned this week');
select is((select (b ->> 'damage')::int from b0), 0, 'untouched at the start');
select is((select b ->> 'week_start' from b0), date_trunc('week', current_date)::date::text, 'the boss of the current week');

select lives_ok($$ select complete_habit('00000000-0000-0000-0000-0000000b0a01') $$, 'a quest is validated');
select is((get_weekly_boss() ->> 'damage')::int, 10, 'each validation hits for 10');

-- Five more validations this week (earlier days), as if done day by day.
reset role;
insert into completions (habit_id, xp_earned, completed_at)
select '00000000-0000-0000-0000-0000000b0a01', 10, date_trunc('week', now()) + make_interval(secs => n)
from generate_series(1, 5) n;
create temp table before on commit drop as select xp, gold from profiles where id = '00000000-0000-0000-0000-0000000b0551';
set local role authenticated;
select is((get_weekly_boss() ->> 'defeated')::boolean, true, '60 damage beats 56 HP');
reset role;
select is((select xp - (select xp from before) from profiles where id = '00000000-0000-0000-0000-0000000b0551'), 0,
  'the reward was paid by the validation that won (not again on reading)');
select is((select count(*)::int from notifications where user_id = '00000000-0000-0000-0000-0000000b0551' and type = 'boss_defeated'), 1,
  'the player is told once');
set local role authenticated;
select throws_ok($$ update weekly_boss_runs set damage = 999 $$, '42501', null, 'players cannot hit the boss by hand');

select * from finish();
rollback;
