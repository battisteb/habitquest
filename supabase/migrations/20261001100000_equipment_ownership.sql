-- Shop review (docs/review/2026-10-revue-app.md):
-- 1. equipped_items only checked the owner of the row, so any player could
--    equip an item they never bought (Premium ones included) through the API,
--    or put an outfit in the hat slot. A trigger now requires a purchase and
--    the slot matching the item category.
-- 2. purchase_item did not enforce the Premium-only rarities (epic,
--    legendary): the app hid them, the server sold them to anyone.

create or replace function public.guard_equipped_items()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_category text;
begin
  select category into v_category from public.shop_items where id = new.item_id;

  if v_category is distinct from 'avatar_' || new.slot then
    raise exception 'This item does not go in the % slot', new.slot using errcode = '22023';
  end if;

  if not exists (select 1 from public.purchases where user_id = new.user_id and item_id = new.item_id) then
    raise exception 'You do not own this item' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_equipped_items() from public, anon, authenticated;

drop trigger if exists guard_equipped_items on public.equipped_items;
create trigger guard_equipped_items
  before insert or update on public.equipped_items
  for each row execute function public.guard_equipped_items();

-- Items equipped without being owned, or in the wrong slot, are taken off.
delete from public.equipped_items e
where not exists (select 1 from public.purchases p where p.user_id = e.user_id and p.item_id = e.item_id)
   or (select category from public.shop_items s where s.id = e.item_id) is distinct from 'avatar_' || e.slot;

-- Same body as 20260927120000_rpc_caller_checks.sql, plus the Premium rarity check
-- (mirrors canViewShopItem / LIMITS.FREE_MAX_RARITY in feature-gates.ts).
create or replace function public.purchase_item(p_user_id uuid, p_item_id uuid)
returns json
language plpgsql
security definer set search_path = ''
as $$
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
  where id = p_item_id and is_available = true;

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
$$;

revoke all on function public.purchase_item(uuid, uuid) from public, anon;
grant execute on function public.purchase_item(uuid, uuid) to authenticated, service_role;
