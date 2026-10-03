-- Seasonal arcs (ADR 024). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(16);

-- ─── Calendar ────────────────────────────────────────────────────────────────
select is((select season from arc_of('2026-10-15')), 'winter', 'October to December is the Winter Arc');
select is((select season from arc_of('2027-02-01')), 'spring', 'January to March is the Spring Arc');
select is((select season from arc_of('2027-05-01')), 'summer', 'April to June is the Summer Arc');
select is((select season from arc_of('2027-08-01')), 'autumn', 'July to September is the Autumn Arc');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000af01', 'arc@test.dev', '{"username":"arcplayer"}');
insert into habits (id, user_id, name, category) values
  ('00000000-0000-0000-0000-00000000af11', '00000000-0000-0000-0000-00000000af01', 'Run', 'fitness');
-- One daily quest: 7 validations planned a week.

-- ─── Weeks of the Winter Arc 2026 ────────────────────────────────────────────
-- Seen on Friday 2 October 2026: its week (Thursday 1 October) is the first.
create temp table s1 on commit drop as
  select arc_state_for('00000000-0000-0000-0000-00000000af01', '2026-10-02')::jsonb as s;
select is((select s ->> 'season' from s1), 'winter', 'the week of 1 October belongs to the Winter Arc');
select is((select (s ->> 'total_weeks')::int from s1), 14, '14 weeks, from 28 September to 28 December');
select is((select s -> 'weeks' -> 0 ->> 'week_start' from s1), '2026-09-28', 'starting with the week of its first Thursday');
select is((select (s ->> 'good_weeks')::int from s1), 0, 'no validation yet: no good week');

-- 5 of 7 days done this week (71 %): a good week. 4 of 7 (57 %) would not be.
insert into completions (habit_id, xp_earned, completed_at)
select '00000000-0000-0000-0000-00000000af11', 11, d::timestamp + interval '12 hours'
from generate_series('2026-09-28'::date, '2026-10-02'::date, interval '1 day') d;
select is((arc_state_for('00000000-0000-0000-0000-00000000af01', '2026-10-02') ->> 'good_weeks')::int, 1,
  '5 days out of 7 make a good week (70 %)');

-- ─── Rune after 8 good weeks ─────────────────────────────────────────────────
-- 7 more good weeks recorded (past weeks are kept as they were).
insert into arc_weeks (user_id, week_start, done, planned)
select '00000000-0000-0000-0000-00000000af01', '2026-10-05'::date + 7 * i, 6, 7 from generate_series(0, 6) i;
create temp table s2 on commit drop as
  select arc_state_for('00000000-0000-0000-0000-00000000af01', '2026-11-25')::jsonb as s;
select is((select (s ->> 'good_weeks')::int from s2), 8, '8 good weeks');
select ok((select (s ->> 'rune_new')::boolean and (s ->> 'rune_earned')::boolean from s2), 'earn the Winter rune');
select is((select array[xp, gold] from profiles where id = '00000000-0000-0000-0000-00000000af01'),
  array[100, 50], 'with +100 XP and +50 gold');
select is((arc_state_for('00000000-0000-0000-0000-00000000af01', '2026-11-26') ->> 'rune_new')::boolean, false,
  'the rune is only given once');

-- ─── The four seasons ────────────────────────────────────────────────────────
insert into user_runes (user_id, season, arc_year) values
  ('00000000-0000-0000-0000-00000000af01', 'spring', 2026),
  ('00000000-0000-0000-0000-00000000af01', 'summer', 2026),
  ('00000000-0000-0000-0000-00000000af01', 'autumn', 2025);
select is(arc_state_for('00000000-0000-0000-0000-00000000af01', '2026-11-27') ->> 'four_seasons_reward', 'premium_week',
  'the 4 runes give a free player a week of Premium');
select ok((select subscription_status = 'premium' and subscription_expires_at > now() + interval '6 days'
           from profiles where id = '00000000-0000-0000-0000-00000000af01'), 'Premium for 7 days');

-- Players cannot write their arc or runes themselves.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000af01","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ insert into user_runes (user_id, season, arc_year) values (auth.uid(), 'winter', 2030) $$,
  '42501', null, 'runes are only given by the server');

select * from finish();
rollback;
