-- Traditional Chinese players (migration 20261007100000). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000077001', 'tw@test.dev', '{"username":"Xiaoming"}');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-000000077001');
set local role authenticated;
select lives_ok($$ update profiles set language = 'zh' where id = auth.uid() $$, 'the app saves 繁體中文 as the player language');
select lives_ok($$ insert into support_messages (category, message, platform, app_version, language)
                   values ('bug', '商店打不開', 'android', '1.0.0', 'zh') $$,
  'a support message sent from the app in Chinese is accepted');
reset role;

set local role anon;
select lives_ok($$ insert into waitlist (email, lang, consent) values ('tw-fan@example.com', 'zh', true) $$,
  'a visitor of the Chinese site joins the waitlist');
select throws_ok($$ insert into waitlist (email, lang, consent) values ('x@example.com', 'zh-CN', true) $$,
  '23514', null, 'only the supported codes');
reset role;

select * from finish();
rollback;
