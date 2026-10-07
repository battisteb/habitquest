-- Segmented founder metrics for /admin: the same health numbers split by
-- language, platform, region (timezone) and plan, plus an activation funnel
-- and weekly signup cohorts. Aggregates only, admin-gated like admin_dashboard.
--
-- Also records the platform a player last opened the app on (web / ios /
-- android). Those two columns get no SELECT grant: other players never see
-- them, only the aggregate below reads them.

alter table public.profiles
  add column if not exists last_platform text check (last_platform in ('web', 'ios', 'android')),
  add column if not exists last_seen_at timestamptz;

-- Called by the app at startup (next to set_timezone).
create or replace function public.track_session(p_platform text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_platform is null or p_platform not in ('web', 'ios', 'android') then
    raise exception 'Unknown platform: %', p_platform;
  end if;
  update public.profiles set last_platform = p_platform, last_seen_at = now() where id = auth.uid();
end;
$$;

revoke all on function public.track_session(text) from public, anon;
grant execute on function public.track_session(text) to authenticated;

-- One row of facts per player (admins excluded so the founder's own testing
-- does not skew the numbers). Internal: not callable by clients.
create or replace function public.admin_user_facts()
returns table (
  user_id uuid,
  language text,
  platform text,
  region text,
  plan text,
  created_at timestamptz,
  has_habit boolean,
  first_done timestamptz,
  active_days int,
  active_7d boolean,
  seen_7d boolean
)
language sql
stable
security definer set search_path = ''
as $$
  select
    p.id,
    p.language,
    coalesce(p.last_platform, 'unknown'),
    case when p.timezone = 'UTC' or p.timezone not like '%/%' then 'unknown'
         else p.timezone end,
    case when p.subscription_status = 'premium'
              and (p.subscription_expires_at is null or p.subscription_expires_at > now())
         then 'premium' else 'free' end,
    p.created_at,
    exists (select 1 from public.habits h where h.user_id = p.id),
    c.first_done,
    coalesce(c.active_days, 0),
    coalesce(c.last_done >= now() - interval '7 days', false),
    coalesce(p.last_seen_at >= now() - interval '7 days', false)
      or coalesce(c.last_done >= now() - interval '7 days', false)
  from public.profiles p
  left join lateral (
    select min(c.completed_at) as first_done,
           max(c.completed_at) as last_done,
           count(distinct (c.completed_at at time zone p.timezone)::date)::int as active_days
    from public.completions c
    join public.habits h on h.id = c.habit_id
    where h.user_id = p.id
  ) c on true
  where not p.is_admin;
$$;

revoke all on function public.admin_user_facts() from public, anon, authenticated;

-- Per-segment row: same columns whatever the dimension.
create or replace function public.admin_segment_rows(p_dim text)
returns jsonb
language sql
stable
security definer set search_path = ''
as $$
  with f as (
    select *,
      case p_dim
        when 'language' then language
        when 'platform' then platform
        when 'region' then region
        when 'plan' then plan
      end as k,
      -- D7 retention: signed up 7-14 days ago, completed a quest in the last 7 days.
      created_at >= now() - interval '14 days' and created_at < now() - interval '7 days' as d7_cohort
    from public.admin_user_facts()
  ),
  g as (
    select k,
      count(*) as users,
      count(*) filter (where created_at >= now() - interval '7 days') as new_7d,
      count(*) filter (where first_done is not null) as activated,
      count(*) filter (where active_7d) as active_7d,
      count(*) filter (where d7_cohort) as d7_cohort,
      count(*) filter (where d7_cohort and active_7d) as d7_kept,
      count(*) filter (where plan = 'premium') as premium
    from f
    group by k
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', k,
    'users', users,
    'new_7d', new_7d,
    'activated', activated,
    'activation_rate', round(100.0 * activated / users),
    'active_7d', active_7d,
    'active_rate', round(100.0 * active_7d / users),
    'd7_cohort', d7_cohort,
    'd7_rate', case when d7_cohort > 0 then round(100.0 * d7_kept / d7_cohort) end,
    'premium', premium
  ) order by users desc, k), '[]'::jsonb)
  from (select * from g order by users desc, k limit 12) t;
$$;

revoke all on function public.admin_segment_rows(text) from public, anon, authenticated;

create or replace function public.admin_segments()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_funnel jsonb;
  v_cohorts jsonb;
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception 'admin only' using errcode = '42501';
  end if;

  -- Each step is a subset of the previous one.
  select jsonb_build_array(
    jsonb_build_object('step', 'signed_up', 'n', count(*)),
    jsonb_build_object('step', 'created_habit', 'n', count(*) filter (where has_habit)),
    jsonb_build_object('step', 'first_quest', 'n', count(*) filter (where first_done is not null)),
    jsonb_build_object('step', 'three_days', 'n', count(*) filter (where active_days >= 3)),
    jsonb_build_object('step', 'active_7d', 'n', count(*) filter (where active_7d))
  ) into v_funnel
  from public.admin_user_facts();

  -- Last 8 weekly signup cohorts (Monday start): share of the cohort that
  -- completed a quest during week 1 (days 1-7 after signing up), week 2
  -- (days 8-14), week 3 and week 4. Null until that week is over for every
  -- player of the cohort.
  with f as (select user_id, created_at from public.admin_user_facts()),
  weeks as (
    select generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') as w
  ),
  c as (
    select f.user_id, f.created_at, date_trunc('week', f.created_at) as w, x.completed_at
    from f
    left join (select h.user_id, cc.completed_at from public.completions cc join public.habits h on h.id = cc.habit_id) x
      on x.user_id = f.user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'week', weeks.w::date,
    'size', s.size,
    'w1', case when now() >= weeks.w + interval '15 days' and s.size > 0 then round(100.0 * s.k1 / s.size) end,
    'w2', case when now() >= weeks.w + interval '22 days' and s.size > 0 then round(100.0 * s.k2 / s.size) end,
    'w3', case when now() >= weeks.w + interval '29 days' and s.size > 0 then round(100.0 * s.k3 / s.size) end,
    'w4', case when now() >= weeks.w + interval '36 days' and s.size > 0 then round(100.0 * s.k4 / s.size) end
  ) order by weeks.w desc), '[]'::jsonb)
  into v_cohorts
  from weeks
  left join lateral (
    select
      count(distinct user_id) as size,
      count(distinct user_id) filter (where completed_at >= created_at + interval '1 day' and completed_at < created_at + interval '8 days') as k1,
      count(distinct user_id) filter (where completed_at >= created_at + interval '8 days' and completed_at < created_at + interval '15 days') as k2,
      count(distinct user_id) filter (where completed_at >= created_at + interval '15 days' and completed_at < created_at + interval '22 days') as k3,
      count(distinct user_id) filter (where completed_at >= created_at + interval '22 days' and completed_at < created_at + interval '29 days') as k4
    from c where c.w = weeks.w
  ) s on true;

  return jsonb_build_object(
    'generated_at', now(),
    'funnel', v_funnel,
    'by_language', public.admin_segment_rows('language'),
    'by_platform', public.admin_segment_rows('platform'),
    'by_region', public.admin_segment_rows('region'),
    'by_plan', public.admin_segment_rows('plan'),
    'cohorts', v_cohorts
  );
end;
$$;

revoke all on function public.admin_segments() from public, anon;
grant execute on function public.admin_segments() to authenticated;
