-- Notification budget (D10, ADR 026): at most 2 server pushes per player per
-- 24 hours. Every notification still lands in the in-app inbox; past the
-- budget it simply arrives without a push.

alter table public.notifications
  add column if not exists pushed boolean not null default false;

create index if not exists notifications_user_pushed_idx
  on public.notifications (user_id, created_at)
  where pushed;

-- Decides, before the row is written, whether it may also go out as a push.
create or replace function public.decide_notification_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialise a player's notifications so two at once cannot both take the last slot.
  perform pg_advisory_xact_lock(hashtext('push:' || new.user_id::text));
  new.pushed := (
    select count(*) < 2
    from public.notifications n
    where n.user_id = new.user_id
      and n.pushed
      and n.created_at > now() - interval '24 hours'
  );
  return new;
end;
$$;

revoke all on function public.decide_notification_push() from public, anon, authenticated;

drop trigger if exists on_notification_decide_push on public.notifications;
create trigger on_notification_decide_push
  before insert on public.notifications
  for each row execute function public.decide_notification_push();

-- Same as before (20260927110000), but only for notifications within the budget.
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
  if not new.pushed then
    return new;
  end if;

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
