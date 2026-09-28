-- Friend invite links (ADR 010). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000bb01', 'host@test.dev', '{"username":"host"}'),
  ('00000000-0000-0000-0000-00000000bb02', 'guest@test.dev', '{"username":"guest"}'),
  ('00000000-0000-0000-0000-00000000bb03', 'snoop@test.dev', '{"username":"snoop"}');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-00000000bb01');
set local role authenticated;
create temp table code on commit drop as select get_invite_code() as c;
select ok((select length(c) >= 8 from code), 'a player gets an invite code');
select is(get_invite_code(), (select c from code), 'the code is stable');
select is((accept_invite((select c from code)) ->> 'status'), 'self', 'you cannot invite yourself');

select pg_temp.act_as('00000000-0000-0000-0000-00000000bb03');
select is((select count(*)::int from invite_codes), 0, 'other players cannot read invite codes');
select is((accept_invite('not-a-code') ->> 'status'), 'invalid', 'an unknown code is rejected');

select pg_temp.act_as('00000000-0000-0000-0000-00000000bb02');
select is((accept_invite((select c from code)) ->> 'status'), 'friends', 'opening the link makes you friends');
select is((select status from friendships
           where requester_id = '00000000-0000-0000-0000-00000000bb01'
             and addressee_id = '00000000-0000-0000-0000-00000000bb02'), 'accepted', 'the friendship is accepted');
select is((accept_invite((select c from code)) ->> 'status'), 'already_friends', 'opening it twice is harmless');

reset role;
select is((select count(*)::int from notifications
           where user_id = '00000000-0000-0000-0000-00000000bb01' and type = 'friend_accepted'), 1,
  'the inviter is notified once');

select * from finish();
rollback;
