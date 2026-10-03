-- Kudos between friends (G4). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000a7001', 'k1@test.dev', '{"username":"Kenji"}'),
  ('00000000-0000-0000-0000-0000000a7002', 'k2@test.dev', '{"username":"Lea"}'),
  ('00000000-0000-0000-0000-0000000a7003', 'k3@test.dev', '{"username":"Stranger"}');
update profiles set language = 'fr' where id = '00000000-0000-0000-0000-0000000a7002';
insert into friendships (requester_id, addressee_id, status) values
  ('00000000-0000-0000-0000-0000000a7001', '00000000-0000-0000-0000-0000000a7002', 'accepted');
insert into habits (id, user_id, name, category) values
  ('00000000-0000-0000-0000-0000000a7102', '00000000-0000-0000-0000-0000000a7002', 'Run', 'fitness'),
  ('00000000-0000-0000-0000-0000000a7103', '00000000-0000-0000-0000-0000000a7003', 'Run', 'fitness');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000a7001');
set local role authenticated;

select is((give_kudos('00000000-0000-0000-0000-0000000a7002')::jsonb ->> 'reason'), 'nothing_today',
  'no kudos before the friend did anything today');
select is((select done_today from friends_today() where friend_id = '00000000-0000-0000-0000-0000000a7002'), 0,
  'friends_today shows an empty day');

reset role;
insert into completions (habit_id, xp_earned) values ('00000000-0000-0000-0000-0000000a7102', 10);
insert into completions (habit_id, xp_earned) values ('00000000-0000-0000-0000-0000000a7103', 10);
set local role authenticated;

select is((select done_today from friends_today() where friend_id = '00000000-0000-0000-0000-0000000a7002'), 1,
  'then one quest done today');
select ok((give_kudos('00000000-0000-0000-0000-0000000a7002')::jsonb ->> 'success')::boolean, 'a friend can cheer');
select is((give_kudos('00000000-0000-0000-0000-0000000a7002')::jsonb ->> 'reason'), 'already_sent', 'once a day');
select ok((select kudos_sent from friends_today() where friend_id = '00000000-0000-0000-0000-0000000a7002'),
  'friends_today remembers it');
select is((give_kudos('00000000-0000-0000-0000-0000000a7003')::jsonb ->> 'reason'), 'not_friends',
  'strangers cannot be cheered (no spam)');
select is((give_kudos('00000000-0000-0000-0000-0000000a7001')::jsonb ->> 'reason'), 'not_friends', 'nor oneself');
select is((select count(*)::int from friends_today()), 1, 'friends_today lists accepted friends only');
select throws_ok($$ insert into kudos (from_user, to_user, day) values
  ('00000000-0000-0000-0000-0000000a7001', '00000000-0000-0000-0000-0000000a7003', current_date) $$,
  '42501', null, 'kudos are only written by give_kudos');
reset role;

select is(
  (select title || ' ' || body from notifications
    where user_id = '00000000-0000-0000-0000-0000000a7002' and type = 'kudos'),
  '👏 Bravo ! Kenji t''encourage pour tes quêtes du jour !',
  'the friend is notified in their language'
);

select * from finish();
rollback;
