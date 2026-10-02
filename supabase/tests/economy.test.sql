-- Server-authoritative economy (ADR 008). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(58);

-- ─── Fixtures ────────────────────────────────────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'alice@test.dev', '{"username":"alice"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'bob@test.dev', '{"username":"bob"}');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select is((select username from profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'alice', 'signup creates the profile');
select hasnt_column('public', 'profiles', 'email', 'profiles no longer exposes e-mail addresses');

-- ─── Habit creation ──────────────────────────────────────────────────────────
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;

insert into habits (id, user_id, name, category)
values ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000a1', 'Read', 'learning');

select is((select count(*)::int from streaks where habit_id = '00000000-0000-0000-0000-00000000c001'),
  1, 'a streak row is created with the habit');

-- ─── Completing a habit ──────────────────────────────────────────────────────
select is((complete_habit('00000000-0000-0000-0000-00000000c001') ->> 'xp_earned')::int,
  11, 'first completion earns 11 XP (streak 1)');
select is((select xp from profiles where id = auth.uid()), 11, 'XP is credited by the server');
select is((select gold from profiles where id = auth.uid()), 1, 'gold is credited by the server');
select is((complete_habit('00000000-0000-0000-0000-00000000c001') ->> 'reason'),
  'already_completed', 'a daily habit cannot be completed twice the same day');
select is((select xp from profiles where id = auth.uid()), 11, 'no XP for the duplicate completion');

-- ─── Direct writes are refused ───────────────────────────────────────────────
select throws_ok($$ update profiles set gold = 999999 where id = auth.uid() $$,
  '42501', null, 'players cannot set their own gold');
select throws_ok($$ update profiles set xp = 999999, level = 11 where id = auth.uid() $$,
  '42501', null, 'players cannot set their own XP or level');
select throws_ok($$ update profiles set subscription_status = 'premium' where id = auth.uid() $$,
  '42501', null, 'players cannot grant themselves premium');
select lives_ok($$ update profiles set username = 'alice2', skin_color = '#ffffff' where id = auth.uid() $$,
  'players can still edit their username and avatar colors');
select throws_ok($$ insert into completions (habit_id, xp_earned) values ('00000000-0000-0000-0000-00000000c001', 500) $$,
  '42501', null, 'completions can only be created by complete_habit');
select throws_ok($$ update streaks set current_count = 365 $$,
  '42501', null, 'players cannot edit streaks');
select throws_ok($$ select add_gold(auth.uid(), 1000) $$,
  '42501', null, 'add_gold is server-only');
select throws_ok($$ select increment_xp(auth.uid(), 1000) $$,
  '42501', null, 'increment_xp is server-only');
select throws_ok($$ select award(auth.uid(), 1000, 1000) $$,
  '42501', null, 'award is server-only');

-- ─── Streak continuation ─────────────────────────────────────────────────────
reset role;
delete from completions where habit_id = '00000000-0000-0000-0000-00000000c001';
update streaks set last_completed_at = now() - interval '1 day'
where habit_id = '00000000-0000-0000-0000-00000000c001';
set local role authenticated;

select is((complete_habit('00000000-0000-0000-0000-00000000c001') ->> 'current_streak')::int,
  2, 'completing the day after continues the streak');

reset role;
delete from completions where habit_id = '00000000-0000-0000-0000-00000000c001';
update streaks set last_completed_at = now() - interval '3 days'
where habit_id = '00000000-0000-0000-0000-00000000c001';
set local role authenticated;

select is((complete_habit('00000000-0000-0000-0000-00000000c001') ->> 'current_streak')::int,
  1, 'missing days without a freeze restarts the streak');

-- ─── Streak breaks and freezes ───────────────────────────────────────────────
reset role;
delete from completions where habit_id = '00000000-0000-0000-0000-00000000c001';
-- A long absence: too many missed days for the freezes, so the streak breaks.
delete from streak_freezes;
update profiles set freeze_tokens = 0 where id = '00000000-0000-0000-0000-0000000000a1';
update streaks set current_count = 10, last_completed_at = now() - interval '12 days'
where habit_id = '00000000-0000-0000-0000-00000000c001';
update profiles set xp = 100, gold = 50 where id = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;

select is((process_streak_breaks() ->> 'xp_loss')::int, 20, 'a broken 10-day streak costs 20 XP');
select is((select current_count from streaks where habit_id = '00000000-0000-0000-0000-00000000c001'),
  0, 'the broken streak is reset');
select is((select gold from profiles where id = auth.uid()), 40, 'and 10 gold');
select is((process_streak_breaks() ->> 'xp_loss')::int, 0, 'processing breaks twice punishes once');

select is(activate_streak_freeze() ->> 'source', 'weekly', 'the first freeze of the week is free');
select is((activate_streak_freeze() ->> 'already_active')::boolean, true, 'freezing twice the same day is a no-op');

reset role;
delete from streak_freezes;
insert into streak_freezes (user_id, freeze_date, source)
values ('00000000-0000-0000-0000-0000000000a1', user_today('00000000-0000-0000-0000-0000000000a1') - 1, 'weekly');
update streaks set current_count = 5, last_completed_at = now() - interval '2 days'
where habit_id = '00000000-0000-0000-0000-00000000c001';
set local role authenticated;

select is((process_streak_breaks() ->> 'xp_loss')::int, 0, 'a frozen day does not break the streak');
select is((complete_habit('00000000-0000-0000-0000-00000000c001') ->> 'current_streak')::int,
  6, 'the streak continues across a frozen day');

reset role;
delete from streak_freezes;
insert into streak_freezes (user_id, freeze_date, source)
values ('00000000-0000-0000-0000-0000000000a1', -- Another day of the current week (Sunday, or Monday when today is Sunday).
        (select case when extract(isodow from d) = 7 then d - 6 else date_trunc('week', d)::date + 6 end
         from (select user_today('00000000-0000-0000-0000-0000000000a1') as d) t), 'weekly');
update profiles set freeze_tokens = 0 where id = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select is(activate_streak_freeze() ->> 'reason', 'no_freeze_left',
  'a second freeze in the same week needs a token');
reset role;
update profiles set freeze_tokens = 1 where id = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select is(activate_streak_freeze() ->> 'source', 'token', 'a token earned with an ad pays for it');
select is((select freeze_tokens from get_my_profile()), 0, 'and is consumed');
select throws_ok($$ insert into streak_freezes (user_id, freeze_date, source) values (auth.uid(), current_date + 1, 'weekly') $$,
  '42501', null, 'freezes can only be created by activate_streak_freeze');

-- Automatic freeze, for everyone: a forgotten day uses the week's free freeze.
reset role;
delete from streak_freezes;
update profiles set freeze_tokens = 0 where id = '00000000-0000-0000-0000-0000000000a1';
update streaks set current_count = 7, last_completed_at = now() - interval '2 days'
where habit_id = '00000000-0000-0000-0000-00000000c001';
set local role authenticated;
select is(jsonb_array_length((process_streak_breaks() -> 'auto_frozen')::jsonb), 1, 'a forgotten day is frozen automatically');
select is((select current_count from streaks where habit_id = '00000000-0000-0000-0000-00000000c001'), 7, 'and the streak survives');
reset role;
select ok((select auto and source = 'weekly' from streak_freezes where user_id = '00000000-0000-0000-0000-0000000000a1'
           and freeze_date = user_today('00000000-0000-0000-0000-0000000000a1') - 1), 'with the free freeze of the week');
-- A gap too long to cover entirely spends nothing.
reset role;
update streaks set current_count = 7, last_completed_at = now() - interval '20 days'
where habit_id = '00000000-0000-0000-0000-00000000c001';
update profiles set freeze_tokens = 2 where id = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select is((process_streak_breaks() -> 'auto_frozen')::text, '[]', 'a long absence is not frozen');
select is((select freeze_tokens from get_my_profile()), 2, 'and spends no token');

-- ─── Challenges ──────────────────────────────────────────────────────────────
reset role;
update profiles set gold = 100 where id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2');
insert into friendships (requester_id, addressee_id, status)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 'accepted');
set local role authenticated;

insert into challenges (id, creator_id, opponent_id, type, target, gold_wager, status, creator_progress)
values ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-0000000000b2', 'completion_count', 1, 20, 'completed', 99);
select is((select status || ':' || creator_progress from challenges where id = '00000000-0000-0000-0000-00000000d001'),
  'pending:0', 'a new challenge always starts pending at 0');
select throws_ok($$ update challenges set status = 'active' where id = '00000000-0000-0000-0000-00000000d001' $$,
  '42501', null, 'the creator cannot accept their own challenge');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select lives_ok($$ update challenges set status = 'active' where id = '00000000-0000-0000-0000-00000000d001' $$,
  'the opponent can accept');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ update challenges set creator_progress = 2 where id = '00000000-0000-0000-0000-00000000d001' $$,
  '42501', null, 'players cannot edit challenge progress');
select throws_ok($$ update challenges set status = 'completed', winner_id = auth.uid() where id = '00000000-0000-0000-0000-00000000d001' $$,
  '42501', null, 'players cannot declare themselves winner');

reset role;
insert into habits (id, user_id, name, category)
values ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-0000000000a1', 'Run', 'fitness');
set local role authenticated;
select complete_habit('00000000-0000-0000-0000-00000000c002');
select is((select creator_progress from challenges where id = '00000000-0000-0000-0000-00000000d001'),
  1, 'completions count towards the challenge');
select is((select status || ':' || (winner_id = auth.uid())::text from challenges where id = '00000000-0000-0000-0000-00000000d001'),
  'completed:true', 'reaching the target wins the challenge');

reset role;
select is((select gold from profiles where id = '00000000-0000-0000-0000-0000000000b2'),
  80, 'the loser pays the wager');
select is((select count(*)::int from notifications where type = 'challenge_completed'
             and user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2')),
  2, 'both players are notified');

-- ─── Duels (friendly: unlimited between friends, no reward) ──────────────────
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
insert into duels (id, challenger_id, opponent_id, status)
values ('00000000-0000-0000-0000-00000000e001', auth.uid(), '00000000-0000-0000-0000-0000000000b2', 'pending');
select lives_ok($$ insert into duels (challenger_id, opponent_id, status) values (auth.uid(), '00000000-0000-0000-0000-0000000000b2', 'pending') $$,
  'no cooldown between two friendly duels');
select lives_ok($$ insert into duels (challenger_id, opponent_id, status) values (auth.uid(), '00000000-0000-0000-0000-0000000000b2', 'pending') $$,
  'no weekly limit either');
select throws_ok($$ insert into duels (challenger_id, opponent_id, status) values (auth.uid(), '00000000-0000-0000-0000-0000000000c9', 'pending') $$,
  '42501', 'Duels are between friends', 'only friends can be challenged');
select throws_ok($$ update duels set status = 'resolved', winner_id = '00000000-0000-0000-0000-0000000000c9' where id = '00000000-0000-0000-0000-00000000e001' $$,
  '42501', null, 'the winner must be a player of the duel');
reset role;
create temp table gold_before on commit drop as select gold from profiles where id = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
update duels set status = 'resolved', winner_id = auth.uid() where id = '00000000-0000-0000-0000-00000000e001';
reset role;
select is((select gold from profiles where id = '00000000-0000-0000-0000-0000000000a1'), (select gold from gold_before), 'a friendly win pays nothing');
set local role authenticated;
select ok(not exists (select 1 from pg_proc where proname = 'claim_duel_reward'), 'there is no duel reward to claim');
select throws_ok($$ update duels set winner_id = '00000000-0000-0000-0000-0000000000b2' where id = '00000000-0000-0000-0000-00000000e001' $$,
  '42501', null, 'a resolved duel cannot be rewritten');

-- ─── Daily quests ────────────────────────────────────────────────────────────
select is((select count(*)::int from assign_daily_quests(auth.uid())), 3, 'three daily quests are assigned');
select throws_ok($$ update user_daily_quests set is_completed = true $$,
  '42501', null, 'players cannot complete quests by hand');
select throws_ok($$ select claim_daily_quest('00000000-0000-0000-0000-0000000000b2', gen_random_uuid()) $$,
  '42501', null, 'nobody can claim quests for another player');

-- ─── Achievements ────────────────────────────────────────────────────────────
reset role;
insert into achievements (id, key, name, description, category, threshold, xp_reward, gold_reward)
values ('00000000-0000-0000-0000-00000000f001', 'test_ach', 'Test', 'Test', 'special', 1, 50, 7);
update profiles set xp = 0, gold = 0 where id = '00000000-0000-0000-0000-0000000000a1';
-- Unlocks are written by check_achievements() (security definer), not by players.
insert into user_achievements (user_id, achievement_id)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000f001');
set local role authenticated;
select is((select xp || '/' || gold from profiles where id = auth.uid()), '50/7',
  'unlocking an achievement grants its catalogue reward');

-- ─── Timezone ────────────────────────────────────────────────────────────────
select lives_ok($$ select set_timezone('Europe/Paris') $$, 'a valid timezone is accepted');
select throws_ok($$ select set_timezone('Mars/Olympus') $$, 'P0001', null, 'an unknown timezone is rejected');

select * from finish();
rollback;
