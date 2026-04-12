-- Table d'inbox in-app (events notifiables)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, -- 'friend_request', 'friend_accepted', 'challenge_started', 'challenge_completed', 'duel_resolved', 'achievement', 'streak_milestone'
  title text not null,
  body text not null,
  data jsonb default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- Allow insert only via the security definer RPC (no direct insert from client)
create policy "Service role can insert notifications" on public.notifications
  for insert with check (true);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id, is_read);

-- RPC for edge functions / triggers to insert notifications
create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
) returns void language plpgsql security definer as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  values (p_user_id, p_type, p_title, p_body, p_data);
end;
$$;
