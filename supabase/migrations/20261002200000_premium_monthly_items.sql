-- Premium item of the month (P10): each month an exclusive cosmetic goes to
-- every Premium player, for free. It is never sold (is_available = false, so
-- purchase_item refuses it) and is only handed out by claim_monthly_item(),
-- which the app calls when the shop opens. Players who were not Premium that
-- month never get it: that is what makes it exclusive.

create table public.premium_monthly_items (
  month date primary key check (extract(day from month) = 1),
  item_id uuid not null unique references public.shop_items (id) on delete restrict
);

alter table public.premium_monthly_items enable row level security;
create policy premium_monthly_items_read on public.premium_monthly_items
  for select to authenticated using (true);
grant select on public.premium_monthly_items to authenticated;

-- The first three items (sprites in scripts/sprites: hats.py, accessories.py).
with items as (
  insert into public.shop_items (name, description, category, price_gold, rarity, required_level, sprite_key, is_available)
  values
    ('Pumpkin Hat', 'Item of the month — October 2026. Premium exclusive.', 'avatar_hat', 0, 'legendary', 1, 'hat_pumpkin', false),
    ('Autumn Scarf', 'Item of the month — November 2026. Premium exclusive.', 'avatar_accessory', 0, 'legendary', 1, 'acc_autumn_scarf', false),
    ('Winter Hat', 'Item of the month — December 2026. Premium exclusive.', 'avatar_hat', 0, 'legendary', 1, 'hat_winter', false)
  returning id, sprite_key
)
insert into public.premium_monthly_items (month, item_id)
select case sprite_key
         when 'hat_pumpkin' then date '2026-10-01'
         when 'acc_autumn_scarf' then date '2026-11-01'
         else date '2026-12-01'
       end, id
from items;

-- Gives this month's item to the caller if they are Premium (once).
create or replace function public.claim_monthly_item()
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_month date;
  v_item public.shop_items;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_month := date_trunc('month', public.user_today(v_uid))::date;
  select i.* into v_item
  from public.premium_monthly_items m
  join public.shop_items i on i.id = m.item_id
  where m.month = v_month;
  if not found then
    return json_build_object('granted', false, 'reason', 'none');
  end if;

  if exists (select 1 from public.purchases where user_id = v_uid and item_id = v_item.id) then
    return json_build_object('granted', false, 'reason', 'owned', 'item_id', v_item.id, 'month', v_month);
  end if;
  if not private.is_premium(v_uid) then
    return json_build_object('granted', false, 'reason', 'not_premium', 'item_id', v_item.id, 'month', v_month);
  end if;

  insert into public.purchases (user_id, item_id) values (v_uid, v_item.id);
  return json_build_object('granted', true, 'item_id', v_item.id, 'month', v_month);
end;
$$;

revoke all on function public.claim_monthly_item() from public, anon;
grant execute on function public.claim_monthly_item() to authenticated;
