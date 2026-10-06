-- Expand the founder metrics dashboard RPC with more product metrics:
-- activation, D7 retention, stickiness, lapsed users, habits by category,
-- social and funnel counts. Still aggregate-only (no per-user personal data)
-- and still admin-gated. Keeps every key the first version returned.

create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_total int; v_premium int; v_new_today int; v_new_7d int; v_activated int;
  v_dau int; v_wau int; v_mau int;
  v_comp_today int; v_comp_7d int; v_active_streaks int; v_habits int; v_habits_archived int;
  v_d7_cohort int; v_d7_ret int;
  v_friends int; v_duels int; v_kudos int; v_moods int;
  v_waitlist int; v_support_open int; v_purchases int;
  v_cats jsonb; v_signups jsonb; v_comps jsonb;
  v_result jsonb;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'admin only' using errcode = '42501';
  end if;

  -- Users
  select count(*) into v_total from public.profiles;
  select count(*) into v_new_today from public.profiles where created_at >= date_trunc('day', now());
  select count(*) into v_new_7d from public.profiles where created_at >= now() - interval '7 days';
  select count(*) into v_premium from public.profiles where subscription_status = 'premium';

  -- Active = completed at least one quest in the window
  select count(distinct h.user_id) into v_dau from public.completions c
    join public.habits h on h.id = c.habit_id where c.completed_at >= now() - interval '1 day';
  select count(distinct h.user_id) into v_wau from public.completions c
    join public.habits h on h.id = c.habit_id where c.completed_at >= now() - interval '7 days';
  select count(distinct h.user_id) into v_mau from public.completions c
    join public.habits h on h.id = c.habit_id where c.completed_at >= now() - interval '30 days';
  -- Activated = ever completed at least one quest
  select count(distinct h.user_id) into v_activated from public.completions c
    join public.habits h on h.id = c.habit_id;

  -- Engagement
  select count(*) into v_comp_today from public.completions where completed_at >= date_trunc('day', now());
  select count(*) into v_comp_7d from public.completions where completed_at >= now() - interval '7 days';
  select count(*) into v_active_streaks from public.streaks where current_count > 0;
  select count(*) into v_habits from public.habits where is_archived = false;
  select count(*) into v_habits_archived from public.habits where is_archived = true;

  -- D7 retention: of users who signed up 7–14 days ago, how many were active in the last 7 days
  select count(*) into v_d7_cohort from public.profiles
    where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days';
  select count(distinct h.user_id) into v_d7_ret from public.completions c
    join public.habits h on h.id = c.habit_id
    join public.profiles p on p.id = h.user_id
    where c.completed_at >= now() - interval '7 days'
      and p.created_at >= now() - interval '14 days' and p.created_at < now() - interval '7 days';

  -- Social & funnel
  select count(*) into v_friends from public.friendships where status = 'accepted';
  select count(*) into v_duels from public.duels;
  select count(*) into v_kudos from public.kudos;
  select count(*) into v_moods from public.mood_logs;
  select count(*) into v_waitlist from public.waitlist;
  select count(*) into v_support_open from public.support_messages where status <> 'done';
  select count(*) into v_purchases from public.purchases;

  -- Active habits by category (top 8)
  select coalesce(jsonb_agg(jsonb_build_object('category', category, 'n', n) order by n desc), '[]'::jsonb)
    into v_cats
  from (select category, count(*) as n from public.habits where is_archived = false
        group by category order by count(*) desc limit 8) t;

  -- 14-day daily series
  select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', s.cnt) order by d), '[]'::jsonb)
    into v_signups
  from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
  left join lateral (select count(*) as cnt from public.profiles p
    where p.created_at >= d and p.created_at < d + interval '1 day') s on true;

  select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', s.cnt) order by d), '[]'::jsonb)
    into v_comps
  from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
  left join lateral (select count(*) as cnt from public.completions c
    where c.completed_at >= d and c.completed_at < d + interval '1 day') s on true;

  v_result := jsonb_build_object(
    'generated_at', now(),
    'users', jsonb_build_object(
      'total', v_total, 'new_today', v_new_today, 'new_7d', v_new_7d, 'premium', v_premium,
      'activated', v_activated,
      'activation_rate', case when v_total > 0 then round(100.0 * v_activated / v_total) else 0 end,
      'premium_rate', case when v_total > 0 then round(100.0 * v_premium / v_total) else 0 end
    ),
    'active', jsonb_build_object(
      'dau', v_dau, 'wau', v_wau, 'mau', v_mau,
      'stickiness', case when v_wau > 0 then round(100.0 * v_dau / v_wau) else 0 end,
      'lapsed_7d', greatest(v_activated - v_wau, 0)
    ),
    'retention', jsonb_build_object(
      'd7_cohort', v_d7_cohort,
      'd7_rate', case when v_d7_cohort > 0 then round(100.0 * v_d7_ret / v_d7_cohort) else null end
    ),
    'engagement', jsonb_build_object(
      'completions_today', v_comp_today, 'completions_7d', v_comp_7d,
      'active_streaks', v_active_streaks, 'habits_total', v_habits, 'habits_archived', v_habits_archived,
      'avg_completions_per_active_7d', case when v_wau > 0 then round((v_comp_7d::numeric / v_wau), 1) else 0 end
    ),
    'social', jsonb_build_object(
      'friends', v_friends, 'duels', v_duels, 'kudos', v_kudos, 'moods', v_moods
    ),
    'funnel', jsonb_build_object(
      'waitlist', v_waitlist, 'support_open', v_support_open, 'purchases', v_purchases
    ),
    'habits_by_category', v_cats,
    'signups_14d', v_signups,
    'completions_14d', v_comps
  );

  return v_result;
end;
$$;
