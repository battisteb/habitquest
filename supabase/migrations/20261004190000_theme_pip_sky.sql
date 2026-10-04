-- Pip's Sky becomes the free theme (Battiste, 2026-10-04, ADR 030). The free theme
-- keeps its key 'default' (profiles.active_theme, the guard below), only its palette
-- changes in the app. The former dark default and a pastel theme go to the shop.
-- Players who already had an account keep the dark theme they started with.

insert into public.shop_items (name, description, category, price_gold, rarity, required_level, sprite_key)
select v.name, v.description, 'theme', v.price, v.rarity, v.lvl, v.key
from (values
  ('Dark Dungeon', 'The original dark pixel art theme.', 50, 'common', 1, 'theme_dungeon'),
  ('Pastel Dawn', 'Lavender and pink pastels.', 120, 'uncommon', 3, 'theme_dawn')
) as v(name, description, price, rarity, lvl, key)
where not exists (select 1 from public.shop_items s where s.sprite_key = v.key);

insert into public.purchases (user_id, item_id)
select p.id, s.id
from public.profiles p
cross join public.shop_items s
where s.sprite_key = 'theme_dungeon'
  and not exists (select 1 from public.purchases x where x.user_id = p.id and x.item_id = s.id);
