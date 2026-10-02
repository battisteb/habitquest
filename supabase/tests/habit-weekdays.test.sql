-- Habits on chosen weekdays, and fair streaks for "N times a week" habits
-- (migration 20261002210000). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(20);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'days@test.dev', '{"username":"days"}');
update profiles set timezone = 'UTC' where id = '00000000-0000-0000-0000-0000000000d1';

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

-- Today's ISO weekday, and the other days.
create temp table t as
  select current_date as today, extract(isodow from current_date)::smallint as dow;
grant select on t to authenticated;

-- ─── Constraint ──────────────────────────────────────────────────────────────
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
set local role authenticated;

select throws_ok($$ insert into habits (user_id, name, frequency) values (auth.uid(), 'x', 'days') $$,
  '23514', null, 'a chosen-days habit needs its days');
select throws_ok($$ insert into habits (user_id, name, frequency, days) values (auth.uid(), 'x', 'daily', '{1}') $$,
  '23514', null, 'only chosen-days habits have days');
select throws_ok($$ insert into habits (user_id, name, frequency, days) values (auth.uid(), 'x', 'days', '{8}') $$,
  '23514', null, 'days are ISO weekdays');
select throws_ok($$ insert into habits (user_id, name, frequency) values (auth.uid(), 'x', 'sometimes') $$,
  '23514', null, 'unknown frequencies are refused');

-- A habit due every day but today, and one due today only.
insert into habits (id, user_id, name, frequency, days) values
  ('00000000-0000-0000-0000-00000000d001', auth.uid(), 'Rest today', 'days',
   (select array_agg(d)::smallint[] from generate_series(1, 7) d, t where d <> t.dow)),
  ('00000000-0000-0000-0000-00000000d002', auth.uid(), 'Today only', 'days',
   (select array[dow] from t));

-- ─── Completing ──────────────────────────────────────────────────────────────
select is(complete_habit('00000000-0000-0000-0000-00000000d001') ->> 'reason', 'not_scheduled',
  'a chosen-days habit cannot be completed on a rest day');
select is((complete_habit('00000000-0000-0000-0000-00000000d002') ->> 'success')::boolean, true,
  'it can on one of its days');
select is(complete_habit('00000000-0000-0000-0000-00000000d002') ->> 'reason', 'already_completed',
  'once per day');

-- ─── Streak over rest days ───────────────────────────────────────────────────
-- "Today only" (one day a week): last done a week ago, so nothing was missed.
reset role;
delete from completions where habit_id = '00000000-0000-0000-0000-00000000d002';
update streaks set current_count = 4, last_completed_at = now() - interval '7 days'
where habit_id = '00000000-0000-0000-0000-00000000d002';
select is(habit_missed_days('00000000-0000-0000-0000-0000000000d1',
  (select h from habits h where id = '00000000-0000-0000-0000-00000000d002'), current_date - 7, current_date),
  '{}'::date[], 'rest days are not missed days');
set local role authenticated;
select is((process_streak_breaks() ->> 'xp_loss')::int, 0, 'rest days do not break the streak');
select is((complete_habit('00000000-0000-0000-0000-00000000d002') ->> 'current_streak')::int, 5,
  'and the streak continues the next due day');

-- Two weeks ago: last week's due day was missed.
reset role;
delete from completions where habit_id = '00000000-0000-0000-0000-00000000d002';
delete from streak_freezes;
update profiles set freeze_tokens = 0 where id = '00000000-0000-0000-0000-0000000000d1';
select is(habit_missed_days('00000000-0000-0000-0000-0000000000d1',
  (select h from habits h where id = '00000000-0000-0000-0000-00000000d002'), current_date - 14, current_date),
  array[current_date - 7], 'a missed due day is reported');

-- ─── N times a week ──────────────────────────────────────────────────────────
-- 3 times a week, created a month ago.
insert into habits (id, user_id, name, frequency, created_at) values
  ('00000000-0000-0000-0000-00000000d003', '00000000-0000-0000-0000-0000000000d1', 'Gym', '3x_week', now() - interval '30 days');
create temp table w as select date_trunc('week', current_date)::date - 7 as last_monday;
grant select on w to authenticated;

-- Last week: Monday, Wednesday, Friday. Two rest days in a row are fine.
insert into completions (habit_id, xp_earned, completed_at)
select '00000000-0000-0000-0000-00000000d003', 10, (last_monday + d)::timestamp + interval '12 hours'
from w, unnest(array[0, 2, 4]) d;
update streaks set current_count = 3, last_completed_at = (select (last_monday + 4)::timestamp + interval '12 hours' from w)
where habit_id = '00000000-0000-0000-0000-00000000d003';
select is(habit_missed_days('00000000-0000-0000-0000-0000000000d1',
  (select h from habits h where id = '00000000-0000-0000-0000-00000000d003'), (select last_monday + 4 from w), current_date),
  '{}'::date[], 'a week that reached its target keeps the streak, whatever the gaps');
set local role authenticated;
select is((process_streak_breaks() ->> 'xp_loss')::int, 0, 'no penalty for the days off of a weekly habit');
select is((select current_count from streaks where habit_id = '00000000-0000-0000-0000-00000000d003'), 3,
  'the weekly streak is kept');

-- Last week only twice: one completion short.
reset role;
delete from completions where habit_id = '00000000-0000-0000-0000-00000000d003'
  and completed_at::date = (select last_monday + 4 from w);
update streaks set last_completed_at = (select (last_monday + 2)::timestamp + interval '12 hours' from w)
where habit_id = '00000000-0000-0000-0000-00000000d003';
select is(cardinality(habit_missed_days('00000000-0000-0000-0000-0000000000d1',
  (select h from habits h where id = '00000000-0000-0000-0000-00000000d003'), (select last_monday + 2 from w), current_date)),
  1, 'a week below its target misses the shortfall');

-- The automatic freeze covers it (the week's free freeze).
set local role authenticated;
select is(jsonb_array_length((process_streak_breaks() -> 'auto_frozen')::jsonb), 1,
  'the shortfall is frozen automatically');
select is((select current_count from streaks where habit_id = '00000000-0000-0000-0000-00000000d003'), 3,
  'and the weekly streak survives');

-- A habit created on Saturday only needs 2 that week (Saturday and Sunday).
reset role;
delete from streak_freezes;
delete from completions where habit_id = '00000000-0000-0000-0000-00000000d003';
update habits set created_at = (select (last_monday + 5)::timestamp from w)
where id = '00000000-0000-0000-0000-00000000d003';
insert into completions (habit_id, xp_earned, completed_at)
select '00000000-0000-0000-0000-00000000d003', 10, (last_monday + d)::timestamp + interval '12 hours'
from w, unnest(array[5, 6]) d;
select is(habit_missed_days('00000000-0000-0000-0000-0000000000d1',
  (select h from habits h where id = '00000000-0000-0000-0000-00000000d003'), (select last_monday + 6 from w), current_date),
  '{}'::date[], 'the first week is prorated');

-- ─── Daily quests ────────────────────────────────────────────────────────────
select ok(not habit_due_on((select h from habits h where id = '00000000-0000-0000-0000-00000000d001'), current_date),
  'a rest day is not due');
select ok(habit_due_on((select h from habits h where id = '00000000-0000-0000-0000-00000000d003'), current_date),
  'a weekly habit can be done any day');

select * from finish();
rollback;
