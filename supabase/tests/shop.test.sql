-- Shop and equipment (docs/review/2026-10-revue-app.md). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(15);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000dd001', 'buyer@test.dev', '{"username":"buyer"}'),
  ('00000000-0000-0000-0000-0000000dd002', 'vip@test.dev', '{"username":"vip"}');
update profiles set gold = 5000, level = 30 where id in
  ('00000000-0000-0000-0000-0000000dd001', '00000000-0000-0000-0000-0000000dd002');
update profiles set subscription_status = 'premium' where id = '00000000-0000-0000-0000-0000000dd002';

-- One item of each kind used below.
create temp table it on commit drop as select
  (select id from shop_items where category = 'avatar_hat' and rarity in ('common', 'uncommon', 'rare')
     and is_available order by price_gold limit 1) as hat,
  (select id from shop_items where category = 'avatar_hat' and rarity in ('common', 'uncommon', 'rare')
     and is_available order by price_gold desc limit 1) as other_hat,
  (select id from shop_items where category = 'avatar_outfit' and rarity in ('common', 'uncommon', 'rare')
     and is_available order by price_gold limit 1) as outfit,
  (select id from shop_items where rarity in ('epic', 'legendary') and category like 'avatar_%'
     and is_available order by price_gold limit 1) as epic;
grant select on it to authenticated;

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000dd001');
set local role authenticated;

select is((purchase_item('00000000-0000-0000-0000-0000000dd001', (select hat from it)) ->> 'success')::boolean,
  true, 'a free player can buy a common item');
select is((purchase_item('00000000-0000-0000-0000-0000000dd001', (select hat from it)) ->> 'error'),
  'Item already owned', 'an item is bought once');
select is((purchase_item('00000000-0000-0000-0000-0000000dd001', (select epic from it)) ->> 'error'),
  'Premium required', 'epic and legendary items are Premium-only, also on the server');
select throws_ok(
  $$select purchase_item('00000000-0000-0000-0000-0000000dd002', (select hat from it))$$,
  '42501', null, 'you cannot buy for someone else');
select throws_ok(
  $$insert into purchases (user_id, item_id) values ('00000000-0000-0000-0000-0000000dd001', (select outfit from it))$$,
  '42501', null, 'purchases cannot be written directly');

select lives_ok(
  $$insert into equipped_items (user_id, item_id, slot) values ('00000000-0000-0000-0000-0000000dd001', (select hat from it), 'hat')$$,
  'an owned hat can be equipped');
select throws_ok(
  $$insert into equipped_items (user_id, item_id, slot) values ('00000000-0000-0000-0000-0000000dd001', (select outfit from it), 'outfit')$$,
  '42501', null, 'an item you do not own cannot be equipped');
select throws_ok(
  $$update equipped_items set item_id = (select other_hat from it) where user_id = '00000000-0000-0000-0000-0000000dd001'$$,
  '42501', null, 'nor swapped in through an update');
select is((purchase_item('00000000-0000-0000-0000-0000000dd001', (select outfit from it)) ->> 'success')::boolean,
  true, 'buying the outfit');
select throws_ok(
  $$insert into equipped_items (user_id, item_id, slot) values ('00000000-0000-0000-0000-0000000dd001', (select outfit from it), 'hat')$$,
  '22023', null, 'an item only goes in its own slot');
select lives_ok(
  $$delete from equipped_items where user_id = '00000000-0000-0000-0000-0000000dd001' and slot = 'hat'$$,
  'an item can be taken off');
select lives_ok(
  $$insert into equipped_items (user_id, item_id, slot) values ('00000000-0000-0000-0000-0000000dd001', (select outfit from it), 'outfit')$$,
  'the bought outfit goes on');

select pg_temp.act_as('00000000-0000-0000-0000-0000000dd002');
select is((purchase_item('00000000-0000-0000-0000-0000000dd002', (select epic from it)) ->> 'success')::boolean,
  true, 'Premium players can buy epic and legendary items');
select is((select count(*)::int from equipped_items where user_id = '00000000-0000-0000-0000-0000000dd001'), 1,
  'other players see what someone wears (friend profiles)');

reset role;
select is((select gold from profiles where id = '00000000-0000-0000-0000-0000000dd001'),
  5000 - (select price_gold from shop_items where id = (select hat from it))
       - (select price_gold from shop_items where id = (select outfit from it)),
  'gold is debited by the server, once per item');

select * from finish();
rollback;
