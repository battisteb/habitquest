-- Achievements are checked by the server (docs/review/2026-10-revue-app.md). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000ff001', 'solo@test.dev', '{"username":"solo"}'),
  ('00000000-0000-0000-0000-0000000ff002', 'pal@test.dev', '{"username":"pal"}');
insert into friendships (requester_id, addressee_id, status)
values ('00000000-0000-0000-0000-0000000ff001', '00000000-0000-0000-0000-0000000ff002', 'accepted');

create function pg_temp.unlocked(p_key text) returns boolean language sql as $$
  select exists (select 1 from user_achievements ua join achievements a on a.id = ua.achievement_id
                 where ua.user_id = '00000000-0000-0000-0000-0000000ff001' and a.key = p_key);
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000ff001', 'role', 'authenticated')::text, true);
set local role authenticated;

create temp table first on commit drop as select check_achievements() as r;
select ok(pg_temp.unlocked('friend_1'), 'one friend unlocks Social Butterfly');
select ok(not pg_temp.unlocked('challenge_1') and not pg_temp.unlocked('challenge_win_1'),
  'but not the challenge achievements any more');
select ok((select json_array_length(r -> 'new') >= 1 from first), 'new unlocks are returned for the toast');
select is((select (e ->> 'current_value')::int from first, json_array_elements(r -> 'achievements') e
           where e ->> 'key' = 'friend_5'), 1, 'progress is reported (1 friend out of 5)');
select is(json_array_length(check_achievements() -> 'new'), 0, 'checking again unlocks nothing new');

select throws_ok($$insert into user_achievements (user_id, achievement_id)
                   select auth.uid(), id from achievements where key = 'xp_5000'$$,
  '42501', null, 'players cannot grant themselves an achievement');

reset role;
insert into challenges (creator_id, opponent_id, type, target, status, winner_id)
values ('00000000-0000-0000-0000-0000000ff001', '00000000-0000-0000-0000-0000000ff002',
        'completion_count', 5, 'completed', '00000000-0000-0000-0000-0000000ff001');
set local role authenticated;
select check_achievements();
select ok(pg_temp.unlocked('challenge_1'), 'launching a challenge unlocks Challenger');
select ok(pg_temp.unlocked('challenge_win_1'), 'winning it unlocks Victor');

select * from finish();
rollback;
