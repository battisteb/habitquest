-- G2: optional "why" and "after…" on a quest, written by its owner only.
-- Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000e1001', 'why1@test.dev', '{"username":"whyone"}'),
  ('00000000-0000-0000-0000-0000000e1002', 'why2@test.dev', '{"username":"whytwo"}');
insert into habits (id, user_id, name, category) values
  ('00000000-0000-0000-0000-0000000e2001', '00000000-0000-0000-0000-0000000e1001', 'Read', 'learning');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000e1001","role":"authenticated"}';
update habits set why = 'Learn every day', anchor = 'my morning coffee'
  where id = '00000000-0000-0000-0000-0000000e2001';
select is((select anchor from habits where id = '00000000-0000-0000-0000-0000000e2001'), 'my morning coffee', 'the owner writes when the quest happens');
select throws_ok(
  $$update habits set why = repeat('x', 141) where id = '00000000-0000-0000-0000-0000000e2001'$$,
  '23514', null, 'a reason is 140 characters at most'
);
select throws_ok(
  $$update habits set anchor = repeat('x', 81) where id = '00000000-0000-0000-0000-0000000e2001'$$,
  '23514', null, 'an anchor is 80 characters at most'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000e1002","role":"authenticated"}';
update habits set why = 'hacked' where id = '00000000-0000-0000-0000-0000000e2001';
reset role;
select is((select why from habits where id = '00000000-0000-0000-0000-0000000e2001'), 'Learn every day', 'nobody else can change it');
select ok(
  (select bool_and(is_nullable = 'YES') from information_schema.columns
   where table_schema = 'public' and table_name = 'habits' and column_name in ('why', 'anchor')),
  'both stay optional'
);

select * from finish();
rollback;
