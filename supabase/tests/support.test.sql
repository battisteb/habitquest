-- Support messages (Settings → Support). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000088001', 'sup-a@test.dev', '{"username":"supa"}'),
  ('00000000-0000-0000-0000-000000088002', 'sup-b@test.dev', '{"username":"supb"}');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-000000088001');
set local role authenticated;

select lives_ok($$ insert into support_messages (category, message, platform, app_version, language)
                   values ('bug', 'The shop does not load', 'ios', '1.0.0', 'en') $$,
  'a player sends a message');
select is((select status from support_messages), 'new', 'it starts unread');
insert into support_messages (category, message, status) values ('idea', 'Already done?', 'done');
select is((select status from support_messages where message = 'Already done?'), 'new', 'a player cannot pick the status');
select throws_ok($$ insert into support_messages (user_id, category, message)
                    values ('00000000-0000-0000-0000-000000088002', 'other', 'Pretending to be B') $$,
  '42501', null, 'nor write as someone else');
select throws_ok($$ insert into support_messages (category, message) values ('bug', '   ') $$,
  '23514', null, 'an empty message is refused');
select throws_ok($$ update support_messages set status = 'done' $$, '42501', null, 'the status belongs to the team');

insert into support_messages (category, message) select 'idea', 'Idea number ' || g from generate_series(1, 3) g;
select throws_ok($$ insert into support_messages (category, message) values ('idea', 'One too many') $$,
  '42501', 'Too many support messages today', 'at most 5 messages per day');

select pg_temp.act_as('00000000-0000-0000-0000-000000088002');
select is((select count(*)::int from support_messages), 0, 'players only see their own messages');

select * from finish();
rollback;
