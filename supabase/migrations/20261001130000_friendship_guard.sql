-- Social review (docs/review/2026-10-revue-app.md). The friendships policies
-- only checked who writes, not what is written:
-- 1. a request could be inserted already 'accepted' (friends without consent),
--    or to oneself;
-- 2. the addressee could rewrite requester_id, befriending anyone;
-- 3. A→B and B→A could both exist, counting the friendship twice.
-- Requests now start pending, a request answering a pending one accepts it,
-- and afterwards only the status moves (pending → accepted/rejected).

create or replace function public.guard_friendship_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Security invoker on purpose: current_user is 'authenticated' for writes
  -- from the app, and the function owner inside trusted SECURITY DEFINER RPCs
  -- (accept_invite creates accepted friendships from an invite link).
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.requester_id = new.addressee_id then
      raise exception 'You cannot befriend yourself' using errcode = '22023';
    end if;
    new.status := 'pending';

    -- A refused request can be sent again later (either direction).
    delete from public.friendships
    where status = 'rejected'
      and ((requester_id = new.requester_id and addressee_id = new.addressee_id)
        or (requester_id = new.addressee_id and addressee_id = new.requester_id));

    -- They already asked us: this request is an answer, accept theirs.
    update public.friendships set status = 'accepted'
    where requester_id = new.addressee_id and addressee_id = new.requester_id and status = 'pending';
    if found then
      return null;
    end if;

    if exists (select 1 from public.friendships
               where requester_id = new.addressee_id and addressee_id = new.requester_id) then
      raise exception 'A friendship already exists' using errcode = '23505';
    end if;
    return new;
  end if;

  -- UPDATE: the addressee answers, nothing else changes.
  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id
     or new.created_at <> old.created_at then
    raise exception 'Only the status of a friendship can change' using errcode = '42501';
  end if;
  if old.status <> 'pending' and new.status <> old.status then
    raise exception 'This request was already answered' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_friendship_writes() from public, anon, authenticated;

drop trigger if exists guard_friendship_writes on public.friendships;
create trigger guard_friendship_writes
  before insert or update on public.friendships
  for each row execute function public.guard_friendship_writes();

-- Existing duplicates (both directions): keep the oldest row.
delete from public.friendships f
using public.friendships g
where f.requester_id = g.addressee_id and f.addressee_id = g.requester_id
  and (f.created_at, f.id) > (g.created_at, g.id);
