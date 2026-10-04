-- Pip's Sky is free, Dark Dungeon and Pastel Dawn are sold (ADR 030). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000055001', 'sky@test.dev', '{"username":"skyhero"}');
update profiles set gold = 1000, level = 10 where id = '00000000-0000-0000-0000-000000055001';

select is((select count(*)::int from shop_items where category = 'theme' and is_available
           and sprite_key in ('theme_dungeon', 'theme_dawn')), 2, 'the dark and the pastel themes are in the shop');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;
select pg_temp.act_as('00000000-0000-0000-0000-000000055001');
set local role authenticated;

select lives_ok($$update profiles set active_theme = 'default' where id = auth.uid()$$, 'Pip''s Sky is free');
select throws_ok($$update profiles set active_theme = 'dungeon' where id = auth.uid()$$, '42501', null,
  'a new player buys the dark theme before using it');
select throws_ok($$update profiles set active_theme = 'dawn' where id = auth.uid()$$, '42501', null,
  'same for the pastel theme');
select is((purchase_item(auth.uid(), (select id from shop_items where sprite_key = 'theme_dawn')) ->> 'success')::boolean,
  true, 'the pastel theme can be bought');
select lives_ok($$update profiles set active_theme = 'dawn' where id = auth.uid()$$, 'a bought theme can be used');
select is((select gold from profiles where id = auth.uid()), 880, 'it costs 120 gold');

select * from finish();
rollback;
