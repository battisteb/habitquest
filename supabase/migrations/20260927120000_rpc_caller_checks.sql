-- Security definer RPCs trusted a p_user_id sent by the client: any signed-in
-- user could drain another player's gold, punish them, or grant them rewards.
-- Every RPC now only acts on the caller (auth.uid()); the service role is exempt.
-- Challenge wagers, the one legitimate cross-player transfer, get their own RPC.
-- See docs/adr/007-rpc-caller-checks.md.

create or replace function public.assert_caller_is(p_user_id uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return;
  end if;
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'Not allowed to act on another user' using errcode = '42501';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- add_gold
-- -----------------------------------------------------------------------------
create or replace function public.add_gold(p_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.assert_caller_is(p_user_id);

  update public.profiles
  set gold = greatest(0, gold + p_amount)
  where id = p_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- increment_xp (body from 20260420110000_fix_level_calculation.sql)
-- -----------------------------------------------------------------------------
create or replace function public.increment_xp(user_id uuid, xp_amount integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  new_xp    integer;
  new_level integer := 0;
  thresholds integer[] := array[0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000];
begin
  perform public.assert_caller_is(increment_xp.user_id);

  update public.profiles
    set xp = xp + xp_amount
    where id = increment_xp.user_id
    returning xp into new_xp;

  for i in 1..array_length(thresholds, 1) loop
    if new_xp >= thresholds[i] then
      new_level := i - 1;
    end if;
  end loop;

  update public.profiles
    set level = new_level
    where id = increment_xp.user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- apply_punishment (body from 20260405180000_punishment_rpc.sql)
-- -----------------------------------------------------------------------------
create or replace function public.apply_punishment(p_user_id uuid, p_xp_loss integer, p_gold_loss integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  new_xp integer;
  new_level integer;
  new_rank text;
  thresholds integer[] := array[0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000];
begin
  perform public.assert_caller_is(p_user_id);

  update public.profiles
  set xp = greatest(0, xp - p_xp_loss),
      gold = greatest(0, gold - p_gold_loss)
  where id = p_user_id
  returning xp into new_xp;

  new_level := 0;
  for i in 1..array_length(thresholds, 1) loop
    if new_xp >= thresholds[i] then
      new_level := i - 1;
    end if;
  end loop;

  case
    when new_level <= 2  then new_rank := 'Novice';
    when new_level <= 4  then new_rank := 'Apprentice';
    when new_level <= 6  then new_rank := 'Warrior';
    when new_level <= 8  then new_rank := 'Knight';
    when new_level <= 10 then new_rank := 'Champion';
    else                      new_rank := 'Legend';
  end case;

  update public.profiles
  set level = new_level,
      rank  = new_rank
  where id = p_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- add_freeze_token (body from 20260412310000_add_freeze_token_rpc.sql, + search_path)
-- -----------------------------------------------------------------------------
create or replace function public.add_freeze_token(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_current integer;
begin
  perform public.assert_caller_is(p_user_id);

  select freeze_tokens into v_current
  from public.profiles where id = p_user_id;

  if v_current is null then
    v_current := 0;
  end if;

  -- Cap at 3 (premium max) to prevent abuse
  if v_current < 3 then
    update public.profiles
    set freeze_tokens = v_current + 1
    where id = p_user_id;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- purchase_item (body from 20260405160000_v2_shop_and_avatar.sql)
-- -----------------------------------------------------------------------------
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
  perform public.assert_caller_is(p_user_id);

  select price_gold, required_level into item_price, item_level
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
  select gold, level into user_gold, user_level
  from public.profiles
  where id = p_user_id
  for update;

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

-- -----------------------------------------------------------------------------
-- Challenge wagers: the winner collects once, from the loser
-- -----------------------------------------------------------------------------
alter table public.challenges
  add column if not exists wager_settled boolean not null default false;

-- Wagers of already completed challenges were paid by the previous client code.
update public.challenges set wager_settled = true where status = 'completed';

create or replace function public.settle_challenge_wager(p_challenge_id uuid)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_challenge public.challenges;
  v_loser uuid;
begin
  select * into v_challenge
  from public.challenges
  where id = p_challenge_id
  for update;

  if not found then
    raise exception 'Challenge not found';
  end if;
  if v_challenge.status <> 'completed' or v_challenge.winner_id is distinct from auth.uid() then
    raise exception 'Only the winner of a completed challenge can collect the wager'
      using errcode = '42501';
  end if;
  if v_challenge.wager_settled or v_challenge.gold_wager <= 0 then
    return 0;
  end if;

  v_loser := case
    when v_challenge.creator_id = v_challenge.winner_id then v_challenge.opponent_id
    else v_challenge.creator_id
  end;

  update public.profiles set gold = gold + v_challenge.gold_wager where id = v_challenge.winner_id;
  update public.profiles set gold = greatest(0, gold - v_challenge.gold_wager) where id = v_loser;
  update public.challenges set wager_settled = true where id = p_challenge_id;

  return v_challenge.gold_wager;
end;
$$;

-- -----------------------------------------------------------------------------
-- Execution rights: signed-in users only
-- -----------------------------------------------------------------------------
revoke all on function public.add_gold(uuid, integer) from public, anon;
revoke all on function public.increment_xp(uuid, integer) from public, anon;
revoke all on function public.apply_punishment(uuid, integer, integer) from public, anon;
revoke all on function public.add_freeze_token(uuid) from public, anon;
revoke all on function public.purchase_item(uuid, uuid) from public, anon;
revoke all on function public.settle_challenge_wager(uuid) from public, anon;

grant execute on function public.add_gold(uuid, integer) to authenticated, service_role;
grant execute on function public.increment_xp(uuid, integer) to authenticated, service_role;
grant execute on function public.apply_punishment(uuid, integer, integer) to authenticated, service_role;
grant execute on function public.add_freeze_token(uuid) to authenticated, service_role;
grant execute on function public.purchase_item(uuid, uuid) to authenticated, service_role;
grant execute on function public.settle_challenge_wager(uuid) to authenticated;
