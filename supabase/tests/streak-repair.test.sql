-- Repair a broken streak within 48 hours (ADR 021). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000ac01', 'repair@test.dev', '{"username":"repair"}');
insert into habits (id, user_id, name, category) values
  ('00000000-0000-0000-0000-00000000ac11', '00000000-0000-0000-0000-00000000ac01', 'Run', 'fitness');
-- A 12-day streak, last kept 4 days ago: 3 missed days, more than the freezes
-- can cover (1 free a week, no token), so it breaks.
insert into completions (habit_id, xp_earned, completed_at)
values ('00000000-0000-0000-0000-00000000ac11', 20, now() - interval '4 days');
update streaks set current_count = 12, longest_count = 12, last_completed_at = now() - interval '4 days'
where habit_id = '00000000-0000-0000-0000-00000000ac11';
update profiles set gold = 30, freeze_tokens = 0 where id = '00000000-0000-0000-0000-00000000ac01';
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000ac01","role":"authenticated"}', true);
set local role authenticated;

select is(jsonb_array_length((process_streak_breaks() -> 'broken')::jsonb), 1, 'the streak breaks');
select is(streak_repair_cost(12), 36, 'repairing 12 days costs 36 gold');
select is(repair_streak('00000000-0000-0000-0000-00000000ac11') ->> 'reason', 'not_enough_gold',
  'not enough gold: no repair');

reset role;
update profiles set gold = 100 where id = '00000000-0000-0000-0000-00000000ac01';
set local role authenticated;
select is((repair_streak('00000000-0000-0000-0000-00000000ac11') ->> 'current_streak')::int, 12,
  'the streak is back to 12');
select is((select gold from get_my_profile()), 64, 'for 36 gold');
select is(jsonb_array_length((process_streak_breaks() -> 'broken')::jsonb), 0, 'and does not break again');
select is((complete_habit('00000000-0000-0000-0000-00000000ac11') ->> 'current_streak')::int, 13,
  'validating today continues it');
select is(repair_streak('00000000-0000-0000-0000-00000000ac11') ->> 'reason', 'not_repairable',
  'a repaired streak cannot be repaired twice');

-- With an ad (free player), once a day.
reset role;
update streaks set broken_count = 5, broken_at = now(), broken_last_day = current_date - 1
where habit_id = '00000000-0000-0000-0000-00000000ac11';
set local role authenticated;
select is((repair_streak('00000000-0000-0000-0000-00000000ac11', true) ->> 'cost')::int, 0, 'an ad pays for it');
reset role;
update streaks set broken_count = 5, broken_at = now() where habit_id = '00000000-0000-0000-0000-00000000ac11';
set local role authenticated;
select is(repair_streak('00000000-0000-0000-0000-00000000ac11', true) ->> 'reason', 'ad_used_today', 'once a day');

-- Too late.
reset role;
update streaks set broken_count = 5, broken_at = now() - interval '49 hours' where habit_id = '00000000-0000-0000-0000-00000000ac11';
set local role authenticated;
select is(repair_streak('00000000-0000-0000-0000-00000000ac11') ->> 'reason', 'not_repairable', 'after 48 hours it is too late');

select throws_ok($$ select repair_streak('00000000-0000-0000-0000-00000000ffff') $$, 'P0002', null,
  'only your own habits');

select * from finish();
rollback;
