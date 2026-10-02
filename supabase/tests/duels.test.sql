-- Friend duels: the challenger records the result, the friend is told (ADR 008). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000077001', 'duel-a@test.dev', '{"username":"Attaquant"}'),
  ('00000000-0000-0000-0000-000000077002', 'duel-b@test.dev', '{"username":"Defenseur"}');
-- Progressive unlocks (I6): these players have reached the feature's level.
update profiles set xp = xp + 850, level = level_for_xp(xp + 850) where id::text like '00000000-0000-0000-0000-000000077%';
update profiles set language = 'fr' where id = '00000000-0000-0000-0000-000000077002';
insert into friendships (requester_id, addressee_id, status)
values ('00000000-0000-0000-0000-000000077001', '00000000-0000-0000-0000-000000077002', 'accepted');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-000000077001');
set local role authenticated;
insert into duels (id, challenger_id, opponent_id, challenger_attack_id, status)
values ('00000000-0000-0000-0000-00000007d001', auth.uid(), '00000000-0000-0000-0000-000000077002', 'balanced_attack', 'resolved');
select is((select status || '/' || coalesce(winner_id::text, '-') from duels where id = '00000000-0000-0000-0000-00000007d001'),
  'pending/-', 'a new duel always starts pending, without a winner');

reset role;
select is((select count(*)::int from notifications where user_id = '00000000-0000-0000-0000-000000077002'), 0,
  'the friend gets no invite: there is nothing to accept');

-- The friend cannot write the result of a duel they did not fight.
select pg_temp.act_as('00000000-0000-0000-0000-000000077002');
set local role authenticated;
select throws_ok($$ update duels set status = 'resolved', winner_id = auth.uid() where id = '00000000-0000-0000-0000-00000007d001' $$,
  '42501', 'Only the challenger records the result', 'only the challenger records the result');
select throws_ok($$ update duels set winner_id = auth.uid() where id = '00000000-0000-0000-0000-00000007d001' $$,
  '42501', 'Only a finished duel has a winner', 'no winner on an unfinished duel');

-- The challenger loses to the friend's hero.
select pg_temp.act_as('00000000-0000-0000-0000-000000077001');
select lives_ok($$ update duels set status = 'resolved', winner_id = '00000000-0000-0000-0000-000000077002' where id = '00000000-0000-0000-0000-00000007d001' $$,
  'the challenger records the result');
select is((select xp from profiles where id = '00000000-0000-0000-0000-000000077001'), 850, 'a friendly loss pays nothing either');
select throws_ok($$ update duels set winner_id = auth.uid() where id = '00000000-0000-0000-0000-00000007d001' $$,
  '42501', 'Duel already over', 'the result is final');

reset role;
select is((select title || ' | ' || body from notifications where user_id = '00000000-0000-0000-0000-000000077002'),
  '⚔️ Duel | Attaquant t’a défié en duel et ton héros a gagné !', 'the friend is told the result, in their language');

-- A draw closes the duel without a winner.
insert into duels (id, challenger_id, opponent_id, status, created_at)
values ('00000000-0000-0000-0000-00000007d002', '00000000-0000-0000-0000-000000077001', '00000000-0000-0000-0000-000000077002', 'pending', now() - interval '3 days');
select pg_temp.act_as('00000000-0000-0000-0000-000000077001');
set local role authenticated;
update duels set status = 'resolved' where id = '00000000-0000-0000-0000-00000007d002';
select is((select status from duels where id = '00000000-0000-0000-0000-00000007d002'), 'resolved', 'a draw closes the duel');

select * from finish();
rollback;
