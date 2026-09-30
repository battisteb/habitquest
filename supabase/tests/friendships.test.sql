-- Friendship rules (docs/review/2026-10-revue-app.md). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000011001', 'amy@test.dev', '{"username":"amy"}'),
  ('00000000-0000-0000-0000-000000011002', 'bob@test.dev', '{"username":"bob"}'),
  ('00000000-0000-0000-0000-000000011003', 'cat@test.dev', '{"username":"cat"}'),
  ('00000000-0000-0000-0000-000000011004', 'dan@test.dev', '{"username":"dan"}');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.link(a uuid, b uuid) returns text language sql as $$
  select coalesce(string_agg(status, ','), 'none') from friendships
  where (requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-000000011001');
set local role authenticated;

-- 1. A request always starts pending, even if the app says otherwise.
insert into friendships (requester_id, addressee_id, status)
values ('00000000-0000-0000-0000-000000011001', '00000000-0000-0000-0000-000000011002', 'accepted');
select is(pg_temp.link('00000000-0000-0000-0000-000000011001', '00000000-0000-0000-0000-000000011002'), 'pending',
  'a request cannot be created already accepted');
select throws_ok($$insert into friendships (requester_id, addressee_id)
  values ('00000000-0000-0000-0000-000000011001', '00000000-0000-0000-0000-000000011001')$$,
  '22023', null, 'you cannot befriend yourself');
update friendships set status = 'accepted' where requester_id = '00000000-0000-0000-0000-000000011001';
select is(pg_temp.link('00000000-0000-0000-0000-000000011001', '00000000-0000-0000-0000-000000011002'), 'pending',
  'the sender cannot accept their own request');

-- 2. The addressee answers, but cannot rewrite who asked.
select pg_temp.act_as('00000000-0000-0000-0000-000000011002');
select throws_ok($$update friendships set requester_id = '00000000-0000-0000-0000-000000011003', status = 'accepted'
  where addressee_id = '00000000-0000-0000-0000-000000011002'$$,
  '42501', null, 'the addressee cannot swap the requester to befriend someone else');
update friendships set status = 'accepted' where addressee_id = '00000000-0000-0000-0000-000000011002';
select is(pg_temp.link('00000000-0000-0000-0000-000000011001', '00000000-0000-0000-0000-000000011002'), 'accepted',
  'the addressee accepts');
select throws_ok($$insert into friendships (requester_id, addressee_id)
  values ('00000000-0000-0000-0000-000000011002', '00000000-0000-0000-0000-000000011001')$$,
  '23505', null, 'no second row in the other direction');

-- 3. Asking someone who already asked you makes you friends, with one row.
select pg_temp.act_as('00000000-0000-0000-0000-000000011003');
insert into friendships (requester_id, addressee_id)
values ('00000000-0000-0000-0000-000000011003', '00000000-0000-0000-0000-000000011004');
select pg_temp.act_as('00000000-0000-0000-0000-000000011004');
insert into friendships (requester_id, addressee_id)
values ('00000000-0000-0000-0000-000000011004', '00000000-0000-0000-0000-000000011003');
select is(pg_temp.link('00000000-0000-0000-0000-000000011003', '00000000-0000-0000-0000-000000011004'), 'accepted',
  'a mutual request becomes a friendship, in a single row');
select throws_ok($$update friendships set status = 'rejected'
  where addressee_id = '00000000-0000-0000-0000-000000011004'$$,
  '42501', null, 'an answered request cannot be flipped');

-- A refused request does not block a new one later.
select pg_temp.act_as('00000000-0000-0000-0000-000000011004');
reset role;
insert into friendships (requester_id, addressee_id, status)
values ('00000000-0000-0000-0000-000000011001', '00000000-0000-0000-0000-000000011004', 'rejected');
set local role authenticated;
insert into friendships (requester_id, addressee_id)
values ('00000000-0000-0000-0000-000000011004', '00000000-0000-0000-0000-000000011001');
select is(pg_temp.link('00000000-0000-0000-0000-000000011001', '00000000-0000-0000-0000-000000011004'), 'pending',
  'after a refusal, a new request can be sent');

-- Invite links (trusted RPC) still create an accepted friendship at once.
reset role;
insert into invite_codes (user_id, code) values ('00000000-0000-0000-0000-000000011003', 'cat-invite');
select pg_temp.act_as('00000000-0000-0000-0000-000000011002');
set local role authenticated;
select is(accept_invite('cat-invite') ->> 'status', 'friends', 'an invite link befriends right away');
select is(pg_temp.link('00000000-0000-0000-0000-000000011002', '00000000-0000-0000-0000-000000011003'), 'accepted',
  'as an accepted friendship');
select lives_ok($$delete from friendships where addressee_id = '00000000-0000-0000-0000-000000011002'
  or requester_id = '00000000-0000-0000-0000-000000011002'$$, 'either side can end a friendship');

select * from finish();
rollback;
