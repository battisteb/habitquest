-- Migration: v2_shop_and_avatar
-- Adds cosmetic shop items, purchases, equipped items, and themes

-- =============================================================================
-- 1. Shop items catalog
-- =============================================================================

create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null
    check (category in ('avatar_hat', 'avatar_outfit', 'avatar_accessory', 'avatar_background', 'theme')),
  price_gold integer not null,
  rarity text not null default 'common'
    check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  required_level integer not null default 0,
  sprite_key text not null default '',
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

-- Shop items are readable by everyone (catalog)
alter table public.shop_items enable row level security;

create policy "Shop items are publicly readable"
  on public.shop_items for select
  using (true);

-- Only service_role can insert/update shop items (admin)
-- No insert/update policies for anon/authenticated

-- =============================================================================
-- 2. User purchases
-- =============================================================================

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.shop_items(id) on delete cascade,
  purchased_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create index idx_purchases_user_id on public.purchases(user_id);

alter table public.purchases enable row level security;

create policy "Users can view own purchases"
  on public.purchases for select
  using (auth.uid() = user_id);

create policy "Users can insert own purchases"
  on public.purchases for insert
  with check (auth.uid() = user_id);

-- =============================================================================
-- 3. Equipped items (avatar customization)
-- =============================================================================

create table public.equipped_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.shop_items(id) on delete cascade,
  slot text not null
    check (slot in ('hat', 'outfit', 'accessory', 'background')),
  equipped_at timestamptz not null default now(),
  unique (user_id, slot)
);

create index idx_equipped_items_user_id on public.equipped_items(user_id);

alter table public.equipped_items enable row level security;

create policy "Users can view own equipped items"
  on public.equipped_items for select
  using (auth.uid() = user_id);

create policy "Users can manage own equipped items"
  on public.equipped_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own equipped items"
  on public.equipped_items for update
  using (auth.uid() = user_id);

create policy "Users can unequip own items"
  on public.equipped_items for delete
  using (auth.uid() = user_id);

-- Allow viewing other users' equipped items (for profile display)
create policy "Equipped items are publicly readable"
  on public.equipped_items for select
  using (true);

-- =============================================================================
-- 4. Active theme column on profiles
-- =============================================================================

alter table public.profiles
  add column active_theme text not null default 'default';

-- =============================================================================
-- 5. Purchase RPC — atomic gold deduction + purchase insert
-- =============================================================================

create or replace function public.purchase_item(p_user_id uuid, p_item_id uuid)
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  item_price integer;
  item_level integer;
  user_gold integer;
  user_level integer;
  already_owned boolean;
begin
  -- Get item details
  select price_gold, required_level into item_price, item_level
  from public.shop_items
  where id = p_item_id and is_available = true;

  if item_price is null then
    return json_build_object('success', false, 'error', 'Item not found or unavailable');
  end if;

  -- Check if already owned
  select exists(
    select 1 from public.purchases where user_id = p_user_id and item_id = p_item_id
  ) into already_owned;

  if already_owned then
    return json_build_object('success', false, 'error', 'Item already owned');
  end if;

  -- Get user gold and level
  select gold, level into user_gold, user_level
  from public.profiles
  where id = p_user_id;

  if user_level < item_level then
    return json_build_object('success', false, 'error', 'Level too low');
  end if;

  if user_gold < item_price then
    return json_build_object('success', false, 'error', 'Not enough gold');
  end if;

  -- Deduct gold
  update public.profiles
  set gold = gold - item_price
  where id = p_user_id;

  -- Insert purchase
  insert into public.purchases (user_id, item_id) values (p_user_id, p_item_id);

  return json_build_object('success', true, 'gold_remaining', user_gold - item_price);
end;
$$;

-- =============================================================================
-- 6. Seed initial shop items
-- =============================================================================

insert into public.shop_items (name, description, category, price_gold, rarity, required_level, sprite_key) values
  -- Hats
  ('Adventurer Cap', 'A simple cap for new adventurers', 'avatar_hat', 10, 'common', 0, 'hat_adventurer'),
  ('Knight Helmet', 'A sturdy iron helmet', 'avatar_hat', 50, 'uncommon', 3, 'hat_knight'),
  ('Wizard Hat', 'Pointy and full of mystery', 'avatar_hat', 100, 'rare', 5, 'hat_wizard'),
  ('Crown of Champions', 'Only for the worthy', 'avatar_hat', 500, 'epic', 9, 'hat_crown'),
  ('Dragon Horns', 'Legendary dragon horns', 'avatar_hat', 1000, 'legendary', 11, 'hat_dragon'),
  -- Outfits
  ('Peasant Clothes', 'Humble beginnings', 'avatar_outfit', 10, 'common', 0, 'outfit_peasant'),
  ('Leather Armor', 'Light and flexible', 'avatar_outfit', 50, 'uncommon', 3, 'outfit_leather'),
  ('Mage Robes', 'Enchanted cloth', 'avatar_outfit', 100, 'rare', 5, 'outfit_mage'),
  ('Golden Plate', 'Shining golden armor', 'avatar_outfit', 500, 'epic', 9, 'outfit_golden'),
  ('Shadow Cloak', 'Woven from shadows', 'avatar_outfit', 1000, 'legendary', 11, 'outfit_shadow'),
  -- Accessories
  ('Wooden Shield', 'Basic protection', 'avatar_accessory', 15, 'common', 0, 'acc_shield_wood'),
  ('Magic Amulet', 'Glows with power', 'avatar_accessory', 75, 'uncommon', 3, 'acc_amulet'),
  ('Flame Sword', 'Burns with fury', 'avatar_accessory', 150, 'rare', 5, 'acc_flame_sword'),
  ('Angel Wings', 'Ethereal wings', 'avatar_accessory', 750, 'epic', 9, 'acc_wings'),
  -- Backgrounds
  ('Forest', 'A peaceful forest', 'avatar_background', 20, 'common', 0, 'bg_forest'),
  ('Castle', 'A grand castle', 'avatar_background', 60, 'uncommon', 3, 'bg_castle'),
  ('Volcano', 'A fiery volcano', 'avatar_background', 120, 'rare', 5, 'bg_volcano'),
  ('Starfield', 'Among the stars', 'avatar_background', 600, 'epic', 9, 'bg_starfield'),
  -- Themes
  ('Ocean Theme', 'Cool blue tones', 'theme', 30, 'common', 0, 'theme_ocean'),
  ('Forest Theme', 'Natural green palette', 'theme', 30, 'common', 0, 'theme_forest'),
  ('Sunset Theme', 'Warm orange hues', 'theme', 80, 'uncommon', 3, 'theme_sunset'),
  ('Neon Theme', 'Cyberpunk neon glow', 'theme', 200, 'rare', 5, 'theme_neon'),
  ('Royal Theme', 'Purple and gold royalty', 'theme', 400, 'epic', 9, 'theme_royal');
