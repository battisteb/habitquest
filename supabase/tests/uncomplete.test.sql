-- Undo a quest validated by mistake: everything it gave is taken back.
-- Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(15);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000ab01', 'oops@test.dev', '{"username":"oops"}'),
  ('00000000-0000-0000-0000-00000000ab02', 'other@test.dev', '{"username":"other"}');

insert into habits (id, user_id, name, category) values
  ('00000000-0000-0000-0000-00000000ab11', '00000000-0000-0000-0000-00000000ab01', 'Run', 'fitness');

-- A 4-day streak, last done yesterday; a "1 habit" mission for today.
insert into completions (habit_id, xp_earned, completed_at)
values ('00000000-0000-0000-0000-00000000ab11', 14, now() - interval '1 day');
update streaks set current_count = 4, longest_count = 4, last_completed_at = now() - interval '1 day'
where habit_id = '00000000-0000-0000-0000-00000000ab11';
update profiles set xp = 100, gold = 20 where id = '00000000-0000-0000-0000-00000000ab01';
insert into user_daily_quests (id, user_id, template_id, assigned_date)
select '00000000-0000-0000-0000-00000000ab21', '00000000-0000-0000-0000-00000000ab01', id,
       user_today('00000000-0000-0000-0000-00000000ab01')
from daily_quest_templates where quest_type = 'complete_habits' and target_value = 1 limit 1;

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000ab01","role":"authenticated"}', true);
set local role authenticated;

-- Validate, claim the mission, then undo.
select is((complete_habit('00000000-0000-0000-0000-00000000ab11') ->> 'current_streak')::int, 5, 'validated: 5-day streak');
select is((claim_daily_quest('00000000-0000-0000-0000-00000000ab01', '00000000-0000-0000-0000-00000000ab21') ->> 'success')::boolean,
  true, 'mission reward claimed');
select is((uncomplete_habit('00000000-0000-0000-0000-00000000ab11') ->> 'success')::boolean, true, 'the validation is undone');

reset role;
select is((select count(*)::int from completions where habit_id = '00000000-0000-0000-0000-00000000ab11'
           and user_local_date('00000000-0000-0000-0000-00000000ab01', completed_at) = user_today('00000000-0000-0000-0000-00000000ab01')),
  0, 'no validation left today');
select is((select array[xp, gold] from profiles where id = '00000000-0000-0000-0000-00000000ab01'),
  array[100, 20], 'XP and gold are back, mission reward included');
select is((select current_count from streaks where habit_id = '00000000-0000-0000-0000-00000000ab11'),
  4, 'the streak is back to 4');
select is((select array[is_completed, is_claimed] from user_daily_quests where id = '00000000-0000-0000-0000-00000000ab21'),
  array[false, false], 'the mission is open again');

set local role authenticated;
select is(uncomplete_habit('00000000-0000-0000-0000-00000000ab11') ->> 'reason', 'not_completed_today',
  'nothing left to undo');
select is((complete_habit('00000000-0000-0000-0000-00000000ab11') ->> 'current_streak')::int, 5,
  'validating again continues the streak');
select is((select xp from profiles where id = auth.uid()), 100 + 15, 'and earns the same XP as before, once');

-- A mission still fulfilled by another quest stays done and claimed.
reset role;
insert into habits (id, user_id, name, category) values
  ('00000000-0000-0000-0000-00000000ab12', '00000000-0000-0000-0000-00000000ab01', 'Read', 'learning');
update user_daily_quests set current_progress = 0, is_completed = false, completed_at = null,
  is_claimed = false, claimed_at = null where id = '00000000-0000-0000-0000-00000000ab21';
delete from completions where habit_id = '00000000-0000-0000-0000-00000000ab11'
  and user_local_date('00000000-0000-0000-0000-00000000ab01', completed_at) = user_today('00000000-0000-0000-0000-00000000ab01');
update profiles set gold = 50 where id = '00000000-0000-0000-0000-00000000ab01';
set local role authenticated;
select complete_habit('00000000-0000-0000-0000-00000000ab11');
select claim_daily_quest('00000000-0000-0000-0000-00000000ab01', '00000000-0000-0000-0000-00000000ab21');
select complete_habit('00000000-0000-0000-0000-00000000ab12');
reset role;
create temp table gold_before on commit drop as select gold from profiles where id = '00000000-0000-0000-0000-00000000ab01';
set local role authenticated;
select is((uncomplete_habit('00000000-0000-0000-0000-00000000ab11') ->> 'gold_lost')::int, 1,
  'unchecking A while B still fulfils the mission takes back only A''s gold');
reset role;
select is((select array[is_completed, is_claimed] from user_daily_quests where id = '00000000-0000-0000-0000-00000000ab21'),
  array[true, true], 'the mission stays done and claimed');
set local role authenticated;
select is((uncomplete_habit('00000000-0000-0000-0000-00000000ab12') ->> 'gold_lost')::int, 1 + 3,
  'unchecking B too takes back its gold and the mission reward');
reset role;
select is((select array[is_completed, is_claimed] from user_daily_quests where id = '00000000-0000-0000-0000-00000000ab21'),
  array[false, false], 'and reopens the mission');
set local role authenticated;

-- Someone else cannot undo it.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000ab02","role":"authenticated"}', true);
select throws_ok($$ select uncomplete_habit('00000000-0000-0000-0000-00000000ab11') $$,
  'P0002', null, 'only the owner can undo a validation');

select * from finish();
rollback;
