-- The admin dashboard RPC is admin-only and returns aggregate metrics.
-- Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

-- Two users; profiles are created by the handle_new_user trigger.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000ad01', 'boss@test.dev', '{"username":"boss"}'),
  ('00000000-0000-0000-0000-00000000ad02', 'joe@test.dev', '{"username":"joe"}');

update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-00000000ad01';

-- A non-admin caller is refused.
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000ad02', 'role', 'authenticated')::text, true);
set local role authenticated;

select throws_ok($$select admin_dashboard()$$, '42501', 'admin only',
  'a non-admin cannot read the dashboard');

-- A player cannot grant themselves admin: the app has no UPDATE grant on
-- profiles at all (revoked in the server-authoritative economy migration).
select throws_ok($$update public.profiles set is_admin = true where id = auth.uid()$$,
  '42501', null, 'a player cannot write profiles (so cannot grant themselves admin)');

-- The admin gets a well-formed payload.
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000ad01', 'role', 'authenticated')::text, true);
set local role authenticated;

create temp table dash on commit drop as select admin_dashboard() as r;

select ok((select r ? 'users' and r ? 'active' and r ? 'engagement' from dash),
  'the payload has the expected sections');
select is((select (r -> 'users' ->> 'total')::int from dash), 2, 'counts the two users');
select is((select jsonb_array_length(r -> 'signups_14d') from dash), 14, 'returns a 14-day signup series');
select is((select jsonb_array_length(r -> 'completions_14d') from dash), 14, 'returns a 14-day completions series');

select * from finish();
rollback;
