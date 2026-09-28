-- Adaptive daily quests (ADR 010). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000aa01', 'newbie@test.dev', '{"username":"newbie"}'),
  ('00000000-0000-0000-0000-00000000aa02', 'empty@test.dev', '{"username":"empty"}');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000aa01","role":"authenticated"}', true);
set local role authenticated;

-- A brand-new player with a single health habit, no streak yet.
insert into habits (user_id, name, category)
values ('00000000-0000-0000-0000-00000000aa01', 'Drink water', 'health');

create temp table assigned on commit drop as
  select t.* from assign_daily_quests('00000000-0000-0000-0000-00000000aa01') q
  join daily_quest_templates t on t.id = q.template_id;

select is((select count(*)::int from assigned), 3, 'three quests are still assigned');
select is((select count(*)::int from assigned where quest_type = 'complete_habits' and target_value > 1), 0,
  'no quest asks for more habits than the player has');
select is((select count(*)::int from assigned where quest_type = 'complete_category' and target_category <> 'health'), 0,
  'category quests only target categories the player has');
select is((select count(*)::int from assigned where quest_type = 'earn_xp' and target_value > 11), 0,
  'XP quests stay within reach (1 habit = 11 XP)');
select is((select count(distinct template_id)::int from user_daily_quests
           where user_id = '00000000-0000-0000-0000-00000000aa01'), 3, 'the three quests are different');
select is((select count(*)::int from assign_daily_quests('00000000-0000-0000-0000-00000000aa01')), 3,
  'calling again the same day returns the same quests');

-- A player without any habit gets no impossible quests.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000aa02","role":"authenticated"}', true);
select is((select count(*)::int from assign_daily_quests('00000000-0000-0000-0000-00000000aa02')), 0,
  'no habit, no quest');

select * from finish();
rollback;
