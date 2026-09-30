-- Q15 (Battiste, option b): the 5 themes sold in the shop (ocean, forest,
-- sunset, neon, royal) did not exist in the app: buying one changed nothing.
-- They are withdrawn (kept for purchase history) and the shop now sells the
-- app's real themes; the dark dungeon theme stays free. A theme can only be
-- activated if it is owned. No refund needed: nobody uses the app yet.

update public.shop_items set is_available = false
where category = 'theme' and sprite_key in ('theme_ocean', 'theme_forest', 'theme_sunset', 'theme_neon', 'theme_royal');

insert into public.shop_items (name, description, category, price_gold, rarity, required_level, sprite_key)
select v.name, v.description, 'theme', v.price, v.rarity, v.lvl, v.key
from (values
  ('Medieval Kingdom', 'Stone, gold and torchlight.', 60, 'common', 2, 'theme_medieval'),
  ('Forest Temple', 'Ancient woods and soft greens.', 100, 'uncommon', 3, 'theme_nature'),
  ('Lifestyle', 'Light, clean and calm.', 150, 'uncommon', 4, 'theme_lifestyle'),
  ('Cyberpunk City', 'Neon lights and dark streets.', 250, 'rare', 5, 'theme_cyberpunk')
) as v(name, description, price, rarity, lvl, key)
where not exists (select 1 from public.shop_items s where s.sprite_key = v.key);

update public.profiles set active_theme = 'default'
where active_theme not in ('default', 'medieval', 'cyberpunk', 'nature', 'lifestyle');

-- Same checks as 20261001160000, the theme must now be owned.
create or replace function public.guard_profile_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Security invoker: only writes coming straight from the app are checked.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.username is distinct from old.username and new.username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Hero names are 3 to 20 letters, digits or _' using errcode = '22023';
  end if;
  if new.skin_color !~ '^#[0-9a-fA-F]{6}$' or new.hair_color !~ '^#[0-9a-fA-F]{6}$'
     or new.eye_color !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'Colors are #rrggbb' using errcode = '22023';
  end if;
  if new.active_theme is distinct from old.active_theme and new.active_theme <> 'default'
     and not exists (
       select 1 from public.purchases p join public.shop_items s on s.id = p.item_id
       where p.user_id = new.id and s.sprite_key = 'theme_' || new.active_theme) then
    raise exception 'This theme is not owned' using errcode = '42501';
  end if;
  return new;
end;
$$;
