-- Mini version of a quest (G1, ADR 027). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

select is(
  (select count(*)::int from pg_proc where proname = 'complete_habit' and pronamespace = 'public'::regnamespace),
  1, 'complete_habit has a single signature (no stale overload)'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000f1001', 'mini@test.dev', '{"username":"miniplayer"}');
insert into habits (id, user_id, name, category, mini) values
  ('00000000-0000-0000-0000-0000000f2001', '00000000-0000-0000-0000-0000000f1001', 'Read 20 pages', 'learning', 'Read 1 page'),
  ('00000000-0000-0000-0000-0000000f2002', '00000000-0000-0000-0000-0000000f1001', 'Run', 'fitness', null);
-- A 4-day streak ending yesterday.
update streaks set current_count = 4, longest_count = 4,
  last_completed_at = now() - interval '1 day'
  where habit_id = '00000000-0000-0000-0000-0000000f2001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000f1001","role":"authenticated"}';

create temp table r on commit drop as
  select complete_habit('00000000-0000-0000-0000-0000000f2001', null, true)::jsonb as j;
select ok((select (j ->> 'success')::boolean from r), 'the mini version validates the quest');
select is((select (j ->> 'current_streak')::int from r), 5, 'and keeps the streak going');
-- Full version at streak 5: round(10 * 1.5) = 15 XP; mini: half, rounded.
select is((select (j ->> 'xp_earned')::int from r), 8, 'for half the XP');
select ok((select (j ->> 'mini')::boolean from r), 'the answer says it was the mini version');
select ok(
  (select is_mini from completions where habit_id = '00000000-0000-0000-0000-0000000f2001'),
  'the completion is marked as mini'
);
select is(
  (select complete_habit('00000000-0000-0000-0000-0000000f2002', null, true)::jsonb ->> 'reason'),
  'no_mini', 'a quest without a mini version cannot be validated as mini'
);
select is(
  (select (complete_habit('00000000-0000-0000-0000-0000000f2002')::jsonb ->> 'xp_earned')::int),
  11, 'the full version is unchanged (two-argument calls still work)'
);
reset role;

select throws_ok(
  $$update habits set mini = repeat('x', 61) where id = '00000000-0000-0000-0000-0000000f2001'$$,
  '23514', null, 'a mini version is 60 characters at most'
);

select * from finish();
rollback;
