-- Co-op challenges (ADR 013): 2 to 4 friends share one goal (validations or
-- XP) over 3, 7 or 14 days. Every validation of an accepted member counts,
-- through a trigger on completions (complete_habit is left untouched). When
-- the goal is reached, each member gets +50 % of the XP they earned during
-- the challenge. Failing costs nothing and there is no gold at stake.
-- One active co-op challenge at a time (2 for Premium), enforced here.
-- Clients go through the RPCs below; the tables are not readable directly.

create table if not exists public.coop_challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  goal text not null check (goal in ('validations', 'xp')),
  target integer not null check (target between 3 and 5000),
  duration_days smallint not null check (duration_days in (3, 7, 14)),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed', 'failed', 'cancelled')),
  progress integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.coop_members (
  challenge_id uuid not null references public.coop_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined')),
  validations integer not null default 0,
  xp integer not null default 0,
  reward_xp integer,
  joined_at timestamptz,
  primary key (challenge_id, user_id)
);

create index if not exists coop_members_user_idx on public.coop_members (user_id);

alter table public.coop_challenges enable row level security;
alter table public.coop_members enable row level security;
grant all on public.coop_challenges, public.coop_members to service_role;

-- =============================================================================
-- Helpers (not callable by clients)
-- =============================================================================

-- Mirrors LIMITS.FREE_COOP_ACTIVE / PREMIUM_COOP_ACTIVE in feature-gates.ts.
create or replace function public.coop_slots_left(p_user_id uuid)
returns integer
language sql
stable
security definer set search_path = ''
as $$
  select (case when (select subscription_status from public.profiles where id = p_user_id) = 'premium'
               then 2 else 1 end)
       - (select count(*)::integer
          from public.coop_members m
          join public.coop_challenges c on c.id = m.challenge_id
          where m.user_id = p_user_id and m.status = 'accepted' and c.status in ('pending', 'active'));
$$;

-- Lazy expiry: runs out of time -> failed; invitations nobody answered in 7 days -> cancelled.
create or replace function public.coop_expire()
returns void
language sql
security definer set search_path = ''
as $$
  update public.coop_challenges set status = 'failed'
  where status = 'active' and ends_at <= now();
  update public.coop_challenges set status = 'cancelled'
  where status = 'pending' and created_at <= now() - interval '7 days';
$$;

revoke all on function public.coop_slots_left(uuid) from public, anon, authenticated;
revoke all on function public.coop_expire() from public, anon, authenticated;

-- =============================================================================
-- Progress
-- =============================================================================

create or replace function public.coop_on_completion()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid;
  v_challenge public.coop_challenges;
  v_member record;
  v_reward integer;
begin
  select user_id into v_uid from public.habits where id = new.habit_id;

  for v_challenge in
    select c.* from public.coop_challenges c
    join public.coop_members m on m.challenge_id = c.id
    where m.user_id = v_uid and m.status = 'accepted'
      and c.status = 'active' and now() < c.ends_at
    for update of c
  loop
    update public.coop_members
    set validations = validations + 1, xp = xp + new.xp_earned
    where challenge_id = v_challenge.id and user_id = v_uid;

    update public.coop_challenges
    set progress = progress + case when goal = 'validations' then 1 else new.xp_earned end
    where id = v_challenge.id
    returning * into v_challenge;

    if v_challenge.progress >= v_challenge.target then
      update public.coop_challenges set status = 'completed', completed_at = now()
      where id = v_challenge.id;

      for v_member in
        select * from public.coop_members
        where challenge_id = v_challenge.id and status = 'accepted'
      loop
        v_reward := ceil(v_member.xp * 0.5)::integer;
        update public.coop_members set reward_xp = v_reward
        where challenge_id = v_challenge.id and user_id = v_member.user_id;
        if v_reward > 0 then
          perform public.award(v_member.user_id, v_reward, 0);
        end if;
        insert into public.notifications (user_id, type, title, body, data)
        values (v_member.user_id, 'coop_completed', '🏆 Co-op challenge complete!',
                'Your team made it! +' || v_reward || ' XP',
                jsonb_build_object('route', '/coop/' || v_challenge.id));
      end loop;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.coop_on_completion() from public, anon, authenticated;

drop trigger if exists coop_on_completion on public.completions;
create trigger coop_on_completion
  after insert on public.completions
  for each row execute function public.coop_on_completion();

-- =============================================================================
-- RPCs
-- =============================================================================

create or replace function public.create_coop_challenge(
  p_friend_ids uuid[], p_goal text, p_target integer, p_days integer)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_friends uuid[];
  v_friend uuid;
  v_id uuid;
  v_name text;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct f), '{}') into v_friends
  from unnest(p_friend_ids) as f where f is not null and f <> v_me;

  if cardinality(v_friends) not between 1 and 3 then
    raise exception 'A co-op challenge needs 1 to 3 friends' using errcode = '22023';
  end if;
  if p_goal not in ('validations', 'xp') or p_days not in (3, 7, 14)
     or (p_goal = 'validations' and p_target not between 3 and 200)
     or (p_goal = 'xp' and p_target not between 30 and 5000) then
    raise exception 'Invalid co-op challenge' using errcode = '22023';
  end if;

  foreach v_friend in array v_friends loop
    if not exists (
      select 1 from public.friendships
      where status = 'accepted'
        and ((requester_id = v_me and addressee_id = v_friend)
          or (requester_id = v_friend and addressee_id = v_me))) then
      raise exception 'You can only invite friends' using errcode = '42501';
    end if;
  end loop;

  perform public.coop_expire();
  if public.coop_slots_left(v_me) <= 0 then
    raise exception 'coop_limit' using errcode = 'P0001';
  end if;

  insert into public.coop_challenges (creator_id, goal, target, duration_days)
  values (v_me, p_goal, p_target, p_days)
  returning id into v_id;

  insert into public.coop_members (challenge_id, user_id, status, joined_at)
  values (v_id, v_me, 'accepted', now());
  insert into public.coop_members (challenge_id, user_id)
  select v_id, unnest(v_friends);

  select username into v_name from public.profiles where id = v_me;
  insert into public.notifications (user_id, type, title, body, data)
  select f, 'coop_invite', '🤝 Co-op challenge',
         coalesce(v_name, 'A friend') || ' invites you to a co-op challenge!',
         jsonb_build_object('route', '/coop/' || v_id)
  from unnest(v_friends) as f;

  return v_id;
end;
$$;

-- The challenge starts when the first friend accepts; later accepts join it.
create or replace function public.respond_coop_challenge(p_id uuid, p_accept boolean)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_challenge public.coop_challenges;
  v_name text;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  perform public.coop_expire();
  select * into v_challenge from public.coop_challenges where id = p_id for update;
  if not found or v_challenge.status not in ('pending', 'active')
     or not exists (select 1 from public.coop_members
                    where challenge_id = p_id and user_id = v_me and status = 'invited') then
    raise exception 'No pending invitation' using errcode = '42501';
  end if;

  if not p_accept then
    update public.coop_members set status = 'declined' where challenge_id = p_id and user_id = v_me;
    -- Everyone said no: nothing left to play.
    if v_challenge.status = 'pending' and not exists (
      select 1 from public.coop_members where challenge_id = p_id and status = 'invited') then
      update public.coop_challenges set status = 'cancelled' where id = p_id;
    end if;
    return;
  end if;

  if public.coop_slots_left(v_me) <= 0 then
    raise exception 'coop_limit' using errcode = 'P0001';
  end if;

  update public.coop_members set status = 'accepted', joined_at = now()
  where challenge_id = p_id and user_id = v_me;

  if v_challenge.status = 'pending' then
    update public.coop_challenges
    set status = 'active', starts_at = now(), ends_at = now() + make_interval(days => duration_days)
    where id = p_id;
  end if;

  select username into v_name from public.profiles where id = v_me;
  insert into public.notifications (user_id, type, title, body, data)
  values (v_challenge.creator_id, 'coop_accepted', '🤝 Co-op challenge',
          coalesce(v_name, 'A friend') || ' joined your co-op challenge!',
          jsonb_build_object('route', '/coop/' || p_id));
end;
$$;

-- Only the creator, and only before anyone joined.
create or replace function public.cancel_coop_challenge(p_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.coop_challenges set status = 'cancelled'
  where id = p_id and creator_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'Only a pending challenge can be cancelled by its creator' using errcode = '42501';
  end if;
end;
$$;

-- My co-op challenges (not the ones I declined), live ones first.
create or replace function public.get_coop_challenges()
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  perform public.coop_expire();

  return (
    select coalesce(json_agg(x.item order by x.rank, x.created_at desc), '[]'::json)
    from (
      select c.created_at,
        case c.status when 'active' then 0 when 'pending' then 1 else 2 end as rank,
        json_build_object(
          'id', c.id, 'goal', c.goal, 'target', c.target, 'duration_days', c.duration_days,
          'status', c.status, 'progress', c.progress, 'starts_at', c.starts_at, 'ends_at', c.ends_at,
          'is_creator', c.creator_id = v_me, 'my_status', me.status,
          'slots_left', public.coop_slots_left(v_me),
          'members', (
            select json_agg(json_build_object(
              'username', p.username, 'status', m.status, 'validations', m.validations,
              'xp', m.xp, 'reward_xp', m.reward_xp, 'is_me', m.user_id = v_me)
              order by m.status, m.validations desc, p.username)
            from public.coop_members m
            join public.profiles p on p.id = m.user_id
            where m.challenge_id = c.id and m.status <> 'declined')) as item
      from public.coop_challenges c
      join public.coop_members me on me.challenge_id = c.id and me.user_id = v_me
      where me.status <> 'declined'
        and (c.status in ('pending', 'active') or c.created_at > now() - interval '30 days')
      order by rank, c.created_at desc
      limit 20
    ) x
  );
end;
$$;

revoke all on function public.create_coop_challenge(uuid[], text, integer, integer) from public, anon;
revoke all on function public.respond_coop_challenge(uuid, boolean) from public, anon;
revoke all on function public.cancel_coop_challenge(uuid) from public, anon;
revoke all on function public.get_coop_challenges() from public, anon;
grant execute on function public.create_coop_challenge(uuid[], text, integer, integer) to authenticated;
grant execute on function public.respond_coop_challenge(uuid, boolean) to authenticated;
grant execute on function public.cancel_coop_challenge(uuid) to authenticated;
grant execute on function public.get_coop_challenges() to authenticated;
