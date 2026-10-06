-- Founder metrics dashboard (web-only, internal).
-- Adds an `is_admin` flag and a single read-only RPC that returns aggregate
-- product metrics. No personal data of individual users is exposed: only
-- counts and daily series. The RPC is SECURITY DEFINER and checks the caller
-- is an admin (ADR 007/009), so RLS on the underlying tables is not bypassed
-- for anyone else.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Founder/admin access to the internal metrics dashboard. Set manually in the DB; never writable from the app.';

create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_result jsonb;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'users', jsonb_build_object(
      'total', (select count(*) from public.profiles),
      'new_today', (select count(*) from public.profiles where created_at >= date_trunc('day', now())),
      'new_7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
      'premium', (select count(*) from public.profiles where subscription_status = 'premium')
    ),
    'active', jsonb_build_object(
      'dau', (select count(distinct h.user_id) from public.completions c
                join public.habits h on h.id = c.habit_id
               where c.completed_at >= now() - interval '1 day'),
      'wau', (select count(distinct h.user_id) from public.completions c
                join public.habits h on h.id = c.habit_id
               where c.completed_at >= now() - interval '7 days'),
      'mau', (select count(distinct h.user_id) from public.completions c
                join public.habits h on h.id = c.habit_id
               where c.completed_at >= now() - interval '30 days')
    ),
    'engagement', jsonb_build_object(
      'completions_7d', (select count(*) from public.completions where completed_at >= now() - interval '7 days'),
      'active_streaks', (select count(*) from public.streaks where current_count > 0),
      'habits_total', (select count(*) from public.habits)
    ),
    'signups_14d', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', s.cnt) order by d), '[]'::jsonb)
      from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
      left join lateral (
        select count(*) as cnt from public.profiles p
         where p.created_at >= d and p.created_at < d + interval '1 day'
      ) s on true
    ),
    'completions_14d', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', s.cnt) order by d), '[]'::jsonb)
      from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
      left join lateral (
        select count(*) as cnt from public.completions c
         where c.completed_at >= d and c.completed_at < d + interval '1 day'
      ) s on true
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard() from public;
grant execute on function public.admin_dashboard() to authenticated;
