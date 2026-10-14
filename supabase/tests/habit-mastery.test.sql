-- Habit mastery (ADR 033, migration 20261014140000). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000c7001', 'master@test.dev', '{"username":"master"}');
update profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000c7001';

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000c7001');
set local role authenticated;

insert into habits (id, user_id, name, category, frequency, goal_value, goal_unit, mastery_level) values
  ('00000000-0000-0000-0000-0000000c7a01', '00000000-0000-0000-0000-0000000c7001', 'Run 20 min', 'fitness', 'daily', 20, 'min', 3),
  ('00000000-0000-0000-0000-0000000c7a02', '00000000-0000-0000-0000-0000000c7001', 'Meditate', 'mindfulness', 'daily', null, null, 0);
select is((select mastery_level from habits where id = '00000000-0000-0000-0000-0000000c7a01'), 0::smallint,
  'a new quest starts without stars, whatever the app sends');

update habits set mastery_level = 2 where id = '00000000-0000-0000-0000-0000000c7a01';
select is((select mastery_level from habits where id = '00000000-0000-0000-0000-0000000c7a01'), 0::smallint,
  'the player cannot give a quest stars');

select is((raise_habit_goal('00000000-0000-0000-0000-0000000c7a01', 25)::jsonb ->> 'reason'), 'too_soon',
  'no raise before 21 days in a row');
select is((raise_habit_goal('00000000-0000-0000-0000-0000000c7a02', 5)::jsonb ->> 'reason'), 'no_goal',
  'a quest without a goal cannot be raised');

reset role;
update streaks set current_count = 21, longest_count = 21, last_completed_at = now() - interval '1 day'
where habit_id = '00000000-0000-0000-0000-0000000c7a01';
set local role authenticated;

select is((raise_habit_goal('00000000-0000-0000-0000-0000000c7a01', 20)::jsonb ->> 'reason'), 'bad_value',
  'the new goal must be higher');
select is((raise_habit_goal('00000000-0000-0000-0000-0000000c7a01', 25)::jsonb ->> 'success'), 'true',
  '21 days in a row: the goal goes up');
select is((select name from habits where id = '00000000-0000-0000-0000-0000000c7a01'), 'Run 25 min',
  'the number in the name follows the goal');
select is((select mastery_level from habits where id = '00000000-0000-0000-0000-0000000c7a01'), 1::smallint, 'one star');
select is((select current_count from streaks where habit_id = '00000000-0000-0000-0000-0000000c7a01'), 21,
  'the streak goes on');
select is((raise_habit_goal('00000000-0000-0000-0000-0000000c7a01', 30)::jsonb ->> 'reason'), 'too_soon',
  'the next star needs 21 more days');

-- Streak 22 → 10 × 3.2 = 32 XP, +20 % for the star = 38.
select is((complete_habit('00000000-0000-0000-0000-0000000c7a01')::jsonb ->> 'xp_earned'), '38',
  'a mastered quest earns 20 % more XP');
reset role;
update habits set mini = 'Run 5 min' where id = '00000000-0000-0000-0000-0000000c7a01';
delete from completions where habit_id = '00000000-0000-0000-0000-0000000c7a01';
update streaks set current_count = 21, last_completed_at = now() - interval '1 day'
where habit_id = '00000000-0000-0000-0000-0000000c7a01';
set local role authenticated;
select is((complete_habit('00000000-0000-0000-0000-0000000c7a01', null, true)::jsonb ->> 'xp_earned'), '16',
  'the mini version keeps half the XP, without the mastery bonus');

select * from finish();
rollback;
