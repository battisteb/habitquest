-- Profile writes and freeze tokens (docs/review/2026-10-revue-app.md). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000044001', 'free@test.dev', '{"username":"freebie"}'),
  ('00000000-0000-0000-0000-000000044002', 'vip2@test.dev', '{"username":"vipper"}');
update profiles set freeze_tokens = 0, gold = 1000, level = 10;
update profiles set subscription_status = 'premium' where id = '00000000-0000-0000-0000-000000044002';

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-000000044001');
set local role authenticated;

select lives_ok($$update profiles set username = 'New_Name1', skin_color = '#aabbcc', active_theme = 'default' where id = auth.uid()$$,
  'a valid name, color and the free theme are accepted');
select throws_ok($$update profiles set username = 'Admin !!' where id = auth.uid()$$, '22023', null,
  'names follow the app rules on the server too');
select throws_ok($$update profiles set username = repeat('x', 200) where id = auth.uid()$$, '22023', null,
  'no giant names');
select throws_ok($$update profiles set hair_color = 'url(javascript:alert(1))' where id = auth.uid()$$, '22023', null,
  'colors are plain #rrggbb');
select throws_ok($$update profiles set active_theme = 'hacker' where id = auth.uid()$$, '42501', null,
  'only known themes');
select throws_ok($$update profiles set active_theme = 'nature' where id = auth.uid()$$, '42501', null,
  'a theme must be bought before it is used');
select is((purchase_item(auth.uid(), (select id from shop_items where sprite_key = 'theme_nature')) ->> 'success')::boolean,
  true, 'the real themes are sold in the shop');
select lives_ok($$update profiles set active_theme = 'nature' where id = auth.uid()$$, 'a bought theme can be used');

select add_freeze_token(auth.uid());
select add_freeze_token(auth.uid());
select add_freeze_token(auth.uid());
select is((select freeze_tokens from get_my_profile()), 1, 'free players hold 1 earned token at most');

select pg_temp.act_as('00000000-0000-0000-0000-000000044002');
select add_freeze_token(auth.uid());
select add_freeze_token(auth.uid());
select add_freeze_token(auth.uid());
select add_freeze_token(auth.uid());
select is((select freeze_tokens from get_my_profile()), 3, 'Premium players hold up to 3');
select throws_ok($$select add_freeze_token('00000000-0000-0000-0000-000000044001')$$, '42501', null,
  'nobody earns tokens for someone else');

reset role;
select lives_ok($$update profiles set username = 'x' where id = '00000000-0000-0000-0000-000000044001'$$,
  'server-side code (admin, triggers) is not restricted');

select * from finish();
rollback;
