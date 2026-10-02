-- Friend duels become a friendly fight (Battiste, 2026-10-02): the arena
-- already gives everyone one ranked fight a day, so duels between friends
-- are unlimited and pay nothing (no gold, no XP: nothing to farm).
--   * no weekly limit, no cooldown between duels; only between friends, at
--     most 20 a day (anti-spam: each result notifies the friend);
--   * claim_duel_reward is removed;
--   * the challenger still records the result once, the friend is told.

create or replace function public.guard_duel_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Only client writes are limited; server code (definer functions) is trusted.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Unlimited for fun, but only between friends and with an anti-spam cap
    -- (each result notifies the friend).
    if not exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = new.challenger_id and f.addressee_id = new.opponent_id)
          or (f.requester_id = new.opponent_id and f.addressee_id = new.challenger_id))
    ) then
      raise exception 'Duels are between friends' using errcode = '42501';
    end if;
    if (select count(*) from public.duels d
        where d.challenger_id = new.challenger_id and d.created_at > now() - interval '1 day') >= 20 then
      raise exception 'Too many duels today' using errcode = '42501';
    end if;
    new.status := 'pending';
    new.winner_id := null;
    new.winner_rewarded := false;
    new.loser_rewarded := false;
    return new;
  end if;

  if new.winner_rewarded is distinct from old.winner_rewarded
     or new.loser_rewarded is distinct from old.loser_rewarded
     or new.challenger_id is distinct from old.challenger_id
     or new.opponent_id is distinct from old.opponent_id then
    raise exception 'Protected duel fields' using errcode = '42501';
  end if;
  if old.status in ('resolved', 'cancelled')
     and (new.status, new.winner_id) is distinct from (old.status, old.winner_id) then
    raise exception 'Duel already over' using errcode = '42501';
  end if;
  if new.status = 'resolved' and old.status <> 'resolved' and auth.uid() is distinct from old.challenger_id then
    raise exception 'Only the challenger records the result' using errcode = '42501';
  end if;
  if new.status <> 'resolved' and new.winner_id is not null then
    raise exception 'Only a finished duel has a winner' using errcode = '42501';
  end if;
  if new.winner_id is not null and new.winner_id not in (new.challenger_id, new.opponent_id) then
    raise exception 'Winner must be a player of the duel' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop function if exists public.claim_duel_reward(uuid);
