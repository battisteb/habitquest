-- Co-op challenges (ADR 013). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(18);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000cc001', 'ana@test.dev', '{"username":"ana"}'),
  ('00000000-0000-0000-0000-0000000cc002', 'ben@test.dev', '{"username":"ben"}'),
  ('00000000-0000-0000-0000-0000000cc003', 'cleo@test.dev', '{"username":"cleo"}'),
  ('00000000-0000-0000-0000-0000000cc004', 'stranger@test.dev', '{"username":"stranger"}');
-- Progressive unlocks (I6): these players have reached the feature's level.
update profiles set xp = xp + 850, level = level_for_xp(xp + 850) where id::text like '00000000-0000-0000-0000-0000000cc%';

insert into friendships (requester_id, addressee_id, status) values
  ('00000000-0000-0000-0000-0000000cc001', '00000000-0000-0000-0000-0000000cc002', 'accepted'),
  ('00000000-0000-0000-0000-0000000cc003', '00000000-0000-0000-0000-0000000cc001', 'accepted');

insert into habits (id, user_id, name, category, frequency) values
  ('00000000-0000-0000-0000-0000000cb001', '00000000-0000-0000-0000-0000000cc001', 'Run', 'fitness', 'daily'),
  ('00000000-0000-0000-0000-0000000cb002', '00000000-0000-0000-0000-0000000cc001', 'Read', 'learning', 'daily'),
  ('00000000-0000-0000-0000-0000000cb003', '00000000-0000-0000-0000-0000000cc001', 'Stretch', 'health', 'daily'),
  ('00000000-0000-0000-0000-0000000cb004', '00000000-0000-0000-0000-0000000cc002', 'Walk', 'fitness', 'daily');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000cc001');
set local role authenticated;

select throws_ok(
  $$select create_coop_challenge(array['00000000-0000-0000-0000-0000000cc004']::uuid[], 'validations', 3, 7)$$,
  '42501', null, 'only friends can be invited');
select throws_ok(
  $$select create_coop_challenge(array['00000000-0000-0000-0000-0000000cc002']::uuid[], 'validations', 1, 7)$$,
  '22023', null, 'targets are bounded');

create temp table ch on commit drop as
  select create_coop_challenge(array['00000000-0000-0000-0000-0000000cc002']::uuid[], 'validations', 3, 7) as id;
grant select on ch to authenticated;
select is((select get_coop_challenges() -> 0 ->> 'status'), 'pending', 'the challenge waits for a friend');
select throws_ok(
  $$select create_coop_challenge(array['00000000-0000-0000-0000-0000000cc003']::uuid[], 'xp', 100, 3)$$,
  'P0001', 'coop_limit', 'free players have one co-op challenge at a time');

-- Nothing counts before the challenge starts.
select complete_habit('00000000-0000-0000-0000-0000000cb001');
select is((select (get_coop_challenges() -> 0 ->> 'progress')::int), 0, 'validations before the start do not count');

select pg_temp.act_as('00000000-0000-0000-0000-0000000cc002');
select lives_ok($$select respond_coop_challenge((select id from ch), true)$$, 'the friend accepts');
select is((select get_coop_challenges() -> 0 ->> 'status'), 'active', 'the first acceptance starts it');
select is((select ((get_coop_challenges() -> 0 ->> 'ends_at')::timestamptz
                 - (get_coop_challenges() -> 0 ->> 'starts_at')::timestamptz)), interval '7 days',
  'it lasts the chosen duration');
select throws_ok($$select cancel_coop_challenge((select id from ch))$$, '42501', null,
  'only the creator can cancel, and only before it starts');

select complete_habit('00000000-0000-0000-0000-0000000cb004');
select pg_temp.act_as('00000000-0000-0000-0000-0000000cc001');
select complete_habit('00000000-0000-0000-0000-0000000cb002');
select is((select (get_coop_challenges() -> 0 ->> 'progress')::int), 2, 'every member validation counts');
select complete_habit('00000000-0000-0000-0000-0000000cb003');
select is((select get_coop_challenges() -> 0 ->> 'status'), 'completed', 'reaching the goal completes it');

select throws_ok('select count(*) from coop_challenges', '42501', null, 'tables are not readable directly');

reset role;
select ok((select bool_and(reward_xp = ceil(xp * 0.5) and xp > 0) from coop_members
           where challenge_id = (select id from ch) and status = 'accepted'),
  'each member earns +50 % of the XP they made during the challenge');
select is((select count(*)::int from notifications where type = 'coop_completed'), 2, 'the whole team is notified');
select is((select count(*)::int from notifications where type = 'coop_invite'
           and user_id = '00000000-0000-0000-0000-0000000cc002'), 1, 'the friend got the invitation');

-- The slot is free again; a refused invitation cancels the challenge.
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000cc001');
create temp table ch2 on commit drop as
  select create_coop_challenge(array['00000000-0000-0000-0000-0000000cc003']::uuid[], 'xp', 100, 3) as id;
grant select on ch2 to authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000cc003');
select lives_ok($$select respond_coop_challenge((select id from ch2), false)$$, 'an invitation can be declined');
select is((select json_array_length(get_coop_challenges())), 0, 'declined challenges disappear');
reset role;
select is((select status from coop_challenges where id = (select id from ch2)), 'cancelled',
  'with nobody left to join, the challenge is cancelled');

select * from finish();
rollback;
