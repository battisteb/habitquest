-- Seasonal cosmetics (G6b, ADR 024): each arc sells its own cape for gold,
-- during the arc only; the four runes also give the Crown of Seasons, which
-- is earned, never sold.

alter table public.shop_items
  add column if not exists season text
  check (season is null or season in ('winter', 'spring', 'summer', 'autumn'));

insert into public.shop_items (name, description, category, price_gold, rarity, required_level, sprite_key, is_available, season)
select v.name, v.description, v.category, v.price_gold, v.rarity, v.required_level, v.sprite_key, false, v.season
from (values
  ('Frost Cape', 'Winter Arc only (October to December).', 'avatar_accessory', 300, 'rare', 3, 'acc_cape_winter', 'winter'),
  ('Blossom Cape', 'Spring Arc only (January to March).', 'avatar_accessory', 300, 'rare', 3, 'acc_cape_spring', 'spring'),
  ('Sun Cape', 'Summer Arc only (April to June).', 'avatar_accessory', 300, 'rare', 3, 'acc_cape_summer', 'summer'),
  ('Harvest Cape', 'Autumn Arc only (July to September).', 'avatar_accessory', 300, 'rare', 3, 'acc_cape_autumn', 'autumn'),
  ('Crown of Seasons', 'Earned with the four seasonal runes.', 'avatar_hat', 0, 'legendary', 1, 'hat_seasons', null)
) as v(name, description, category, price_gold, rarity, required_level, sprite_key, season)
where not exists (select 1 from public.shop_items s where s.sprite_key = v.sprite_key);

-- Same as 20261001100000_equipment_ownership, plus the seasonal rule.
create or replace function public.purchase_item(p_user_id uuid, p_item_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $function$
declare
  item_price integer;
  item_level integer;
  item_rarity text;
  user_gold integer;
  user_level integer;
  user_status text;
  already_owned boolean;
begin
  perform public.assert_caller_is(p_user_id);

  select price_gold, required_level, rarity into item_price, item_level, item_rarity
  from public.shop_items
  where id = p_item_id
    and (is_available
         -- Seasonal items (G6b): sold during their arc only, in the player's time zone.
         or season = (select a.season from public.arc_of(public.user_today(p_user_id)) a));

  if item_price is null then
    return json_build_object('success', false, 'error', 'Item not found or unavailable');
  end if;

  select exists(
    select 1 from public.purchases where user_id = p_user_id and item_id = p_item_id
  ) into already_owned;

  if already_owned then
    return json_build_object('success', false, 'error', 'Item already owned');
  end if;

  -- Lock the row so two concurrent purchases cannot both pass the gold check
  select gold, level, subscription_status into user_gold, user_level, user_status
  from public.profiles
  where id = p_user_id
  for update;

  if item_rarity in ('epic', 'legendary') and user_status is distinct from 'premium' then
    return json_build_object('success', false, 'error', 'Premium required');
  end if;

  if user_level < item_level then
    return json_build_object('success', false, 'error', 'Level too low');
  end if;

  if user_gold < item_price then
    return json_build_object('success', false, 'error', 'Not enough gold');
  end if;

  update public.profiles
  set gold = gold - item_price
  where id = p_user_id;

  insert into public.purchases (user_id, item_id) values (p_user_id, p_item_id);

  return json_build_object('success', true, 'gold_remaining', user_gold - item_price);
end;
$function$;

revoke all on function public.purchase_item(uuid, uuid) from public, anon;
grant execute on function public.purchase_item(uuid, uuid) to authenticated, service_role;

-- The four seasons reward (arc_state_for) also gives the Crown of Seasons.
create or replace function public.grant_seasons_crown()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.purchases (user_id, item_id)
  select new.id, s.id from public.shop_items s
  where s.sprite_key = 'hat_seasons'
    and not exists (select 1 from public.purchases p where p.user_id = new.id and p.item_id = s.id);
  return new;
end;
$$;

revoke all on function public.grant_seasons_crown() from public, anon, authenticated;

drop trigger if exists on_four_seasons_grant_crown on public.profiles;
create trigger on_four_seasons_grant_crown
  after update of four_seasons_rewarded_at on public.profiles
  for each row
  when (old.four_seasons_rewarded_at is null and new.four_seasons_rewarded_at is not null)
  execute function public.grant_seasons_crown();

-- Players who already completed the four seasons.
insert into public.purchases (user_id, item_id)
select p.id, s.id
from public.profiles p
cross join public.shop_items s
where p.four_seasons_rewarded_at is not null and s.sprite_key = 'hat_seasons'
  and not exists (select 1 from public.purchases x where x.user_id = p.id and x.item_id = s.id);
