-- 1v1 challenge rules (docs/review/2026-10-revue-app.md). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000022001', 'red@test.dev', '{"username":"red"}'),
  ('00000000-0000-0000-0000-000000022002', 'blue@test.dev', '{"username":"blue"}'),
  ('00000000-0000-0000-0000-000000022003', 'nobody@test.dev', '{"username":"nobody"}');
insert into friendships (requester_id, addressee_id, status)
values ('00000000-0000-0000-0000-000000022001', '00000000-0000-0000-0000-000000022002', 'accepted');
update profiles set gold = 100 where id in ('00000000-0000-0000-0000-000000022001', '00000000-0000-0000-0000-000000022002');
insert into habits (id, user_id, name, category, frequency) values
  ('00000000-0000-0000-0000-000000022b01', '00000000-0000-0000-0000-000000022001', 'Run', 'fitness', 'daily'),
  ('00000000-0000-0000-0000-000000022b02', '00000000-0000-0000-0000-000000022001', 'Read', 'learning', 'daily');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-000000022001');
set local role authenticated;

select throws_ok($$insert into challenges (creator_id, opponent_id, type, target, gold_wager)
  values (auth.uid(), '00000000-0000-0000-0000-000000022003', 'completion_count', 5, 10)$$,
  '42501', null, 'only friends can be challenged');
select throws_ok($$insert into challenges (creator_id, opponent_id, type, target, gold_wager)
  values (auth.uid(), auth.uid(), 'completion_count', 5, 10)$$,
  '22023', null, 'nobody can challenge themselves');

insert into challenges (id, creator_id, opponent_id, type, target, gold_wager, starts_at, ends_at)
values ('00000000-0000-0000-0000-000000022c01', auth.uid(), '00000000-0000-0000-0000-000000022002',
        'completion_count', 5, 30, now() - interval '30 days', now() - interval '27 days');

select pg_temp.act_as('00000000-0000-0000-0000-000000022002');
update challenges set status = 'active' where id = '00000000-0000-0000-0000-000000022c01';
select ok((select ends_at > now() + interval '2 days 23 hours' and ends_at < now() + interval '3 days 1 hour'
           from challenges where id = '00000000-0000-0000-0000-000000022c01'),
  'the 3-day clock starts when the challenge is accepted');
select throws_ok($$update challenges set status = 'cancelled' where id = '00000000-0000-0000-0000-000000022c01'$$,
  '42501', null, 'an accepted challenge cannot be cancelled (no dodging a loss)');

select pg_temp.act_as('00000000-0000-0000-0000-000000022001');
select complete_habit('00000000-0000-0000-0000-000000022b01');
select is((select creator_progress from challenges where id = '00000000-0000-0000-0000-000000022c01'), 1,
  'validations count while the challenge runs');

reset role;
update challenges set ends_at = now() - interval '1 minute' where id = '00000000-0000-0000-0000-000000022c01';
set local role authenticated;
select complete_habit('00000000-0000-0000-0000-000000022b02');
select is((select creator_progress from challenges where id = '00000000-0000-0000-0000-000000022c01'), 1,
  'validations after the end do not count');

select is(settle_expired_challenges(), 1, 'the expired challenge is settled');
select is((select status || '/' || (winner_id = auth.uid()) from challenges where id = '00000000-0000-0000-0000-000000022c01'),
  'completed/true', 'the one ahead wins');
select is((select string_agg(gold::text, ',' order by username) from profiles
           where id in ('00000000-0000-0000-0000-000000022001', '00000000-0000-0000-0000-000000022002')),
  '70,' || ((select gold from profiles where id = '00000000-0000-0000-0000-000000022001'))::text,
  'the wager goes from the loser to the winner');
select is(settle_expired_challenges(), 0, 'settling twice changes nothing');

-- A pending challenge can still be called off.
insert into challenges (id, creator_id, opponent_id, type, target, gold_wager)
values ('00000000-0000-0000-0000-000000022c02', auth.uid(), '00000000-0000-0000-0000-000000022002', 'xp_race', 100, 0);
select lives_ok($$update challenges set status = 'cancelled' where id = '00000000-0000-0000-0000-000000022c02'$$,
  'a pending challenge can be cancelled');

select * from finish();
rollback;
