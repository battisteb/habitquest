-- Sign-up and hero names (docs/review/2026-10-revue-app.md). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000033001', 'first@test.dev', '{"username":"Zelda"}');

set local role anon;
select is(username_available('zelda'), false, 'a taken name is reported, whatever the case');
select is(username_available('Link'), true, 'a free name is reported');
reset role;

select lives_ok($$insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000033002', 'second@test.dev', '{"username":"Zelda"}')$$,
  'signing up with a taken name no longer fails');
select matches((select username from profiles where id = '00000000-0000-0000-0000-000000033002'),
  '^Zelda_[0-9a-f]{4}$', 'the second hero gets a short suffix');
select lives_ok($$insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000033003', 'zelda@test.dev')$$,
  'an e-mail prefix colliding with a name is handled too');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000033004', 'jean.dupont@test.dev');
select is((select username from profiles where id = '00000000-0000-0000-0000-000000033004'), 'jeandupont',
  'a name made from an e-mail follows the hero name rules');

select * from finish();
rollback;
