-- Push notifications: private token storage, trusted notification creation,
-- server-side push dispatch and duel invitations. See docs/adr/006-push-notifications.md.

-- =============================================================================
-- 1. Push tokens move out of the publicly readable profiles table
-- =============================================================================

create table if not exists public.push_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  token text not null unique,
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

-- Users can only see their own token; writes go through the RPCs below.
create policy "Users can view own push token"
  on public.push_tokens for select
  using (auth.uid() = user_id);

insert into public.push_tokens (user_id, token)
  select id, push_token from public.profiles where push_token is not null
  on conflict do nothing;

alter table public.profiles drop column if exists push_token;

-- A device token belongs to whoever signed in last on that device.
create or replace function public.register_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[.+\]$' then
    raise exception 'Invalid push token';
  end if;

  delete from public.push_tokens where token = p_token and user_id <> auth.uid();
  insert into public.push_tokens (user_id, token, updated_at)
    values (auth.uid(), p_token, now())
    on conflict (user_id) do update set token = excluded.token, updated_at = now();
end;
$$;

create or replace function public.unregister_push_token()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.push_tokens where user_id = auth.uid();
end;
$$;

revoke all on function public.register_push_token(text) from public, anon;
revoke all on function public.unregister_push_token() from public, anon;
grant execute on function public.register_push_token(text) to authenticated;
grant execute on function public.unregister_push_token() to authenticated;

-- =============================================================================
-- 2. Notifications can only target yourself or a friend
-- =============================================================================

-- Any authenticated user could insert a notification for anyone.
-- The service role bypasses RLS, so no insert policy is needed.
drop policy if exists "Service role can insert notifications" on public.notifications;

create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_type not in (
    'friend_request', 'friend_accepted', 'challenge_started', 'challenge_completed',
    'duel_invite', 'duel_resolved', 'achievement', 'streak_milestone'
  ) then
    raise exception 'Unknown notification type: %', p_type;
  end if;
  if char_length(p_title) > 100 or char_length(p_body) > 300 then
    raise exception 'Notification too long';
  end if;

  -- Clients may notify themselves or someone they share a friendship row with
  -- (pending requests included). Server code (service role) is unrestricted.
  if coalesce(auth.role(), '') <> 'service_role'
     and p_user_id <> auth.uid()
     and not exists (
       select 1 from public.friendships f
       where (f.requester_id = auth.uid() and f.addressee_id = p_user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = p_user_id)
     ) then
    raise exception 'Not allowed to notify this user';
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (p_user_id, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb));
end;
$$;

revoke all on function public.create_notification(uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.create_notification(uuid, text, text, text, jsonb) to authenticated, service_role;

-- =============================================================================
-- 3. Every new notification is also sent as a push (Edge Function dispatch-push)
-- =============================================================================

create extension if not exists pg_net with schema extensions;

-- Needs two Vault secrets (see ADR 006): 'project_url' and 'push_dispatch_secret'.
-- Without them the trigger does nothing, so local/dev databases keep working.
create or replace function public.dispatch_push_for_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';

  if v_url is not null and v_secret is not null then
    perform net.http_post(
      url := v_url || '/functions/v1/dispatch-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-dispatch-secret', v_secret
      ),
      body := jsonb_build_object('notification_id', new.id)
    );
  end if;
  return new;
exception when others then
  -- A push failure must never block the in-app notification.
  return new;
end;
$$;

drop trigger if exists on_notification_created_dispatch_push on public.notifications;
create trigger on_notification_created_dispatch_push
  after insert on public.notifications
  for each row execute function public.dispatch_push_for_notification();

-- =============================================================================
-- 4. Duel invitations notify the opponent (server-side, cannot be spoofed)
-- =============================================================================

create or replace function public.notify_duel_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select username into v_name from public.profiles where id = new.challenger_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    new.opponent_id,
    'duel_invite',
    '⚔️ Duel challenge',
    coalesce(v_name, 'A player') || ' challenged you to a duel!',
    jsonb_build_object('route', '/duels', 'duelId', new.id)
  );
  return new;
end;
$$;

drop trigger if exists on_duel_created_notify on public.duels;
create trigger on_duel_created_notify
  after insert on public.duels
  for each row
  when (new.status = 'pending')
  execute function public.notify_duel_invite();
