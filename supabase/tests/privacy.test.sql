-- Private profile fields and API surface (pre-release audit). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000099001', 'priv-a@test.dev', '{"username":"Alice"}'),
  ('00000000-0000-0000-0000-000000099002', 'priv-b@test.dev', '{"username":"Bruno"}');
update profiles set timezone = 'Europe/Paris', subscription_status = 'premium', freeze_tokens = 2
where id = '00000000-0000-0000-0000-000000099002';

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-000000099001');
set local role authenticated;

select is((select username || ' ' || level from profiles where id = '00000000-0000-0000-0000-000000099002'),
  'Bruno 1', 'other players still see the public profile');
select throws_ok($$ select timezone from profiles where id = '00000000-0000-0000-0000-000000099002' $$,
  '42501', null, 'but not their time zone');
select throws_ok($$ select subscription_status from profiles $$, '42501', null, 'nor their subscription');
select throws_ok($$ select * from profiles $$, '42501', null, 'select * is refused');

select pg_temp.act_as('00000000-0000-0000-0000-000000099002');
select is((select timezone || ' ' || subscription_status || ' ' || freeze_tokens from get_my_profile()),
  'Europe/Paris premium 2', 'a player reads their own private fields');
select is((select count(*)::int from get_my_profile()), 1, 'and only their own row');

select ok(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
  'trigger functions are not callable through the API');
select ok(not has_function_privilege('anon', 'public.get_my_profile()', 'execute'),
  'get_my_profile needs a signed-in player');

reset role;
select is((select count(*)::int from pg_proc where proname = 'notify_duel_invite'), 0,
  'the leftover duel invite function is gone');

select * from finish();
rollback;
