-- Pausing a quest protects its streak; the pause date is the server's.
-- Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000d5001', 'pause@test.dev', '{"username":"pauser"}');
insert into habits (id, user_id, name, category) values
  ('00000000-0000-0000-0000-0000000d5101', '00000000-0000-0000-0000-0000000d5001', 'Read', 'learning'),
  ('00000000-0000-0000-0000-0000000d5102', '00000000-0000-0000-0000-0000000d5001', 'Run', 'fitness');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000d5001","role":"authenticated"}', true);
set local role authenticated;

-- The app sends a backdated pause: the server keeps its own clock.
update habits set is_paused = true, paused_at = now() - interval '30 days'
where id = '00000000-0000-0000-0000-0000000d5101';
select ok((select paused_at > now() - interval '1 minute' from habits where id = '00000000-0000-0000-0000-0000000d5101'),
  'the pause starts now, whatever the app sends');
update habits set paused_at = now() - interval '30 days' where id = '00000000-0000-0000-0000-0000000d5101';
select ok((select paused_at > now() - interval '1 minute' from habits where id = '00000000-0000-0000-0000-0000000d5101'),
  'and the app cannot move it afterwards');
reset role;

-- Read: a 5-day streak, last done 5 days ago, paused right after.
-- Run: last done 6 days ago, a day missed, then paused 4 days ago.
alter table habits disable trigger on_habit_pause_guard;
update habits set is_paused = true, paused_at = now() - interval '5 days' + interval '1 hour'
where id = '00000000-0000-0000-0000-0000000d5101';
update habits set is_paused = true, paused_at = now() - interval '4 days'
where id = '00000000-0000-0000-0000-0000000d5102';
alter table habits enable trigger on_habit_pause_guard;
update streaks set current_count = 5, longest_count = 5, last_completed_at = now() - interval '5 days'
where habit_id = '00000000-0000-0000-0000-0000000d5101';
update streaks set current_count = 3, longest_count = 3, last_completed_at = now() - interval '6 days'
where habit_id = '00000000-0000-0000-0000-0000000d5102';

set local role authenticated;
update habits set is_paused = false where user_id = '00000000-0000-0000-0000-0000000d5001';
select ok((select paused_at is null from habits where id = '00000000-0000-0000-0000-0000000d5101'), 'resuming clears the pause');
select is((complete_habit('00000000-0000-0000-0000-0000000d5101')::jsonb ->> 'current_streak')::int, 6,
  'paused days do not break the streak');
select is((complete_habit('00000000-0000-0000-0000-0000000d5102')::jsonb ->> 'current_streak')::int, 1,
  'a day missed before the pause still breaks it');
reset role;

select ok(not has_function_privilege('authenticated', 'public.guard_habit_pause()', 'execute'),
  'the pause guard cannot be called directly');

select * from finish();
rollback;
