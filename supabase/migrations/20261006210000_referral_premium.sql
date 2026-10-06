-- Referral reward: when someone you invited gets started (completes their
-- first quest), both of you get 7 days of Premium. Server-authoritative
-- (ADR 008): the app never grants Premium; this is decided here.
--
-- Flow: accept_invite records a referral (invitee -> referrer). A trigger on
-- the first completion of the invitee grants both a week of Premium (temporary,
-- via subscription_expires_at), once, with an anti-abuse cap on the referrer.

create table if not exists public.referrals (
  invitee_id uuid primary key references public.profiles(id) on delete cascade,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  check (invitee_id <> referrer_id)
);

alter table public.referrals enable row level security;

create policy "see own referrals"
  on public.referrals for select
  using (auth.uid() = invitee_id or auth.uid() = referrer_id);

grant select on public.referrals to authenticated;
grant all on public.referrals to service_role;

create index if not exists referrals_referrer_idx on public.referrals (referrer_id);

-- Grant p_days of Premium without ever shortening or clobbering a permanent
-- (paid) subscription. Extends from the later of now and the current expiry.
create or replace function public.grant_referral_premium(p_user uuid, p_days int)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_status text;
  v_exp timestamptz;
begin
  select subscription_status, subscription_expires_at into v_status, v_exp
    from public.profiles where id = p_user for update;
  if v_status = 'premium' and v_exp is null then
    return; -- permanent premium: leave it alone
  end if;
  update public.profiles
     set subscription_status = 'premium',
         subscription_expires_at = greatest(coalesce(v_exp, now()), now()) + make_interval(days => p_days)
   where id = p_user;
end;
$$;

revoke all on function public.grant_referral_premium(uuid, int) from public, anon, authenticated;

-- On the invitee's first completion, reward the referral once.
create or replace function public.referral_on_completion()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_invitee uuid;
  v_referrer uuid;
  v_cap constant int := 10;   -- a referrer earns at most this many referral weeks
  v_rewarded_count int;
begin
  select user_id into v_invitee from public.habits where id = new.habit_id;
  if v_invitee is null then return null; end if;

  select referrer_id into v_referrer from public.referrals
    where invitee_id = v_invitee and rewarded_at is null;
  if v_referrer is null then return null; end if;

  -- Claim the reward atomically so concurrent completions grant it only once.
  update public.referrals set rewarded_at = now()
    where invitee_id = v_invitee and rewarded_at is null;
  if not found then return null; end if;

  -- The invitee always gets their welcome week.
  perform public.grant_referral_premium(v_invitee, 7);
  insert into public.notifications (user_id, type, title, body, data)
  values (v_invitee, 'referral_reward', '🎁 A week of Premium!',
          'Welcome! You just unlocked 7 days of Premium.',
          jsonb_build_object('route', '/(tabs)/social'));

  -- The referrer gets a week too, up to the anti-abuse cap.
  select count(*) into v_rewarded_count from public.referrals
    where referrer_id = v_referrer and rewarded_at is not null;
  if v_rewarded_count <= v_cap then
    perform public.grant_referral_premium(v_referrer, 7);
    insert into public.notifications (user_id, type, title, body, data)
    values (v_referrer, 'referral_reward', '🎁 A week of Premium!',
            'A friend you invited got started — enjoy 7 days of Premium!',
            jsonb_build_object('route', '/(tabs)/social'));
  end if;

  return null;
end;
$$;

revoke all on function public.referral_on_completion() from public, anon, authenticated;

drop trigger if exists referral_on_completion on public.completions;
create trigger referral_on_completion
  after insert on public.completions
  for each row execute function public.referral_on_completion();

-- Record the referral when an invite link creates a brand-new friendship.
-- (Same body as 20260928120000_friend_invites.sql, plus the referral insert.)
create or replace function public.accept_invite(p_code text)
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_inviter uuid;
  v_name text;
  v_me text;
  v_existing public.friendships;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select user_id into v_inviter from public.invite_codes where code = p_code;
  if v_inviter is null then
    return json_build_object('status', 'invalid');
  end if;

  select username into v_name from public.profiles where id = v_inviter;
  if v_inviter = auth.uid() then
    return json_build_object('status', 'self', 'username', v_name);
  end if;

  select * into v_existing from public.friendships
  where (requester_id = v_inviter and addressee_id = auth.uid())
     or (requester_id = auth.uid() and addressee_id = v_inviter)
  for update;

  if found and v_existing.status = 'accepted' then
    return json_build_object('status', 'already_friends', 'username', v_name, 'user_id', v_inviter);
  elsif found then
    update public.friendships set status = 'accepted' where id = v_existing.id;
  else
    insert into public.friendships (requester_id, addressee_id, status)
    values (v_inviter, auth.uid(), 'accepted');
    -- Brand-new connection via an invite link: record the referral (once per
    -- invitee). The reward is granted later, on the invitee's first completion.
    insert into public.referrals (invitee_id, referrer_id)
    values (auth.uid(), v_inviter)
    on conflict (invitee_id) do nothing;
  end if;

  select username into v_me from public.profiles where id = auth.uid();
  insert into public.notifications (user_id, type, title, body, data)
  values (v_inviter, 'friend_accepted', '🤝 New friend',
          coalesce(v_me, 'A player') || ' joined you with your invite link!',
          jsonb_build_object('route', '/(tabs)/social'));

  return json_build_object('status', 'friends', 'username', v_name, 'user_id', v_inviter);
end;
$$;

revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;
