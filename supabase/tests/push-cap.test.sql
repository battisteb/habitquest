-- Notification budget (D10, ADR 026): 2 server pushes per player per 24 hours.
-- Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000d1001', 'cap1@test.dev', '{"username":"capone"}'),
  ('00000000-0000-0000-0000-0000000d1002', 'cap2@test.dev', '{"username":"captwo"}');

-- A push sent yesterday no longer counts.
insert into notifications (user_id, type, title, body, created_at)
  values ('00000000-0000-0000-0000-0000000d1001', 'duel_resolved', 't', 'b', now() - interval '25 hours');
update notifications set pushed = true where user_id = '00000000-0000-0000-0000-0000000d1001';

insert into notifications (id, user_id, type, title, body) values
  ('00000000-0000-0000-0000-0000000d2001', '00000000-0000-0000-0000-0000000d1001', 'friend_request', 't', 'b'),
  ('00000000-0000-0000-0000-0000000d2002', '00000000-0000-0000-0000-0000000d1001', 'duel_resolved', 't', 'b'),
  ('00000000-0000-0000-0000-0000000d2003', '00000000-0000-0000-0000-0000000d1001', 'coop_completed', 't', 'b');

select ok((select pushed from notifications where id = '00000000-0000-0000-0000-0000000d2001'), 'the first notification of the day is pushed');
select ok((select pushed from notifications where id = '00000000-0000-0000-0000-0000000d2002'), 'the second too');
select ok(not (select pushed from notifications where id = '00000000-0000-0000-0000-0000000d2003'), 'the third only reaches the inbox');
select is((select count(*)::int from notifications where user_id = '00000000-0000-0000-0000-0000000d1001'), 4, 'every notification is kept in the inbox');

insert into notifications (id, user_id, type, title, body) values
  ('00000000-0000-0000-0000-0000000d2004', '00000000-0000-0000-0000-0000000d1002', 'friend_request', 't', 'b');
select ok((select pushed from notifications where id = '00000000-0000-0000-0000-0000000d2004'), 'each player has their own budget');

-- A player cannot mark a notification as pushed (only is_read is writable).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000d1001","role":"authenticated"}';
select throws_ok(
  $$update notifications set pushed = true where id = '00000000-0000-0000-0000-0000000d2003'$$,
  '42501', null, 'the push flag is not writable from the app'
);
reset role;
select ok(not has_function_privilege('authenticated', 'public.decide_notification_push()', 'execute'), 'the budget trigger cannot be called directly');

select * from finish();
rollback;
