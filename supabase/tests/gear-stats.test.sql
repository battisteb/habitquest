-- Shop items improve combat stats (migration 20261002220000, ADR 017).
-- Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000ee001', 'gear@test.dev', '{"username":"gear"}');

-- One item of each kind, with known rarities.
insert into shop_items (id, name, category, price_gold, rarity, required_level, sprite_key, is_available) values
  ('00000000-0000-0000-0000-0000000ee101', 'Test sword', 'avatar_accessory', 10, 'rare', 1, 'acc_test_sword', true),
  ('00000000-0000-0000-0000-0000000ee102', 'Test helm', 'avatar_hat', 10, 'uncommon', 1, 'hat_test_helm', true),
  ('00000000-0000-0000-0000-0000000ee103', 'Test armor', 'avatar_outfit', 10, 'legendary', 1, 'outfit_test_armor', true),
  ('00000000-0000-0000-0000-0000000ee104', 'Test sky', 'avatar_background', 10, 'epic', 1, 'bg_test_sky', true);

select is(gear_points('common'), 1, 'a common item is worth 1 point');
select is(gear_points('legendary'), 5, 'a legendary item is worth 5 points');

select is((select (attack, defense, hp)::text from gear_stats('00000000-0000-0000-0000-0000000ee001')),
  '(0,0,0)', 'no equipment, no bonus');
select is(arena_gear_attack(null), 0, 'bots have no equipment');

insert into purchases (user_id, item_id)
select '00000000-0000-0000-0000-0000000ee001', id from shop_items where id::text like '00000000-0000-0000-0000-0000000ee1%';
insert into equipped_items (user_id, item_id, slot) values
  ('00000000-0000-0000-0000-0000000ee001', '00000000-0000-0000-0000-0000000ee101', 'accessory'),
  ('00000000-0000-0000-0000-0000000ee001', '00000000-0000-0000-0000-0000000ee102', 'hat'),
  ('00000000-0000-0000-0000-0000000ee001', '00000000-0000-0000-0000-0000000ee103', 'outfit'),
  ('00000000-0000-0000-0000-0000000ee001', '00000000-0000-0000-0000-0000000ee104', 'background');

select is((select attack from gear_stats('00000000-0000-0000-0000-0000000ee001')), 3, 'the accessory gives attack');
select is((select defense from gear_stats('00000000-0000-0000-0000-0000000ee001')), 2, 'the hat gives defense');
select is((select hp from gear_stats('00000000-0000-0000-0000-0000000ee001')), 5, 'the outfit gives HP');

select is(arena_gear_attack('00000000-0000-0000-0000-0000000ee001'), 12, 'arena attack: +4 per attack point');
select is(arena_gear_defense('00000000-0000-0000-0000-0000000ee001'), 14, 'arena defense: +2 per defense or HP point; backgrounds stay cosmetic');

set local role authenticated;
select throws_ok($$ select gear_stats('00000000-0000-0000-0000-0000000ee001') $$,
  '42501', null, 'the bonus is computed by the server only');

select * from finish();
rollback;
