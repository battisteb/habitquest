-- Automatic streak freeze, for everyone (Battiste, 2026-10-02): a freeze is
-- meant to cover a forgotten day, so it should not need to be activated in
-- advance. When a streak would break, the missed days are covered with the
-- freezes the player has (the free one of each week first, then tokens).
-- If the whole gap cannot be covered, nothing is spent and the streak breaks
-- as before (a long absence does not drain the tokens for nothing).

alter table public.streak_freezes add column if not exists auto boolean not null default false;

create or replace function public.process_streak_breaks()
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_row record;
  v_last date;
  v_missing date[];
  v_plan text[];
  v_day date;
  v_tokens integer;
  v_tokens_left integer;
  v_weeks_used date[];
  v_week date;
  i integer;
  v_xp_loss integer := 0;
  v_gold_loss integer := 0;
  v_broken jsonb := '[]'::jsonb;
  v_frozen jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  v_today := public.user_today(v_uid);

  for v_row in
    select s.habit_id, s.current_count, s.last_completed_at
    from public.streaks s
    join public.habits h on h.id = s.habit_id
    where h.user_id = v_uid
      and not h.is_archived
      and not h.is_paused
      and s.current_count > 0
      and s.last_completed_at is not null
    for update of s
  loop
    v_last := public.user_local_date(v_uid, v_row.last_completed_at);
    -- Completed today or yesterday (or the gap is already frozen): alive.
    if v_last >= v_today - 1 or public.streak_continues(v_uid, v_last, v_today) then
      continue;
    end if;

    -- Days of the gap without a freeze.
    select array_agg(d::date order by d) into v_missing
    from generate_series(v_last + 1, v_today - 1, interval '1 day') as d
    where not exists (select 1 from public.streak_freezes f where f.user_id = v_uid and f.freeze_date = d::date);

    -- Plan: the free weekly freeze where that week's one is unused, else a token.
    select freeze_tokens into v_tokens from public.profiles where id = v_uid for update;
    v_tokens_left := coalesce(v_tokens, 0);
    select coalesce(array_agg(distinct date_trunc('week', f.freeze_date)::date), '{}')
      into v_weeks_used
    from public.streak_freezes f
    where f.user_id = v_uid and f.source = 'weekly'
      and f.freeze_date >= date_trunc('week', v_last + 1)::date;
    v_plan := '{}';
    foreach v_day in array v_missing loop
      v_week := date_trunc('week', v_day)::date;
      if not (v_week = any (v_weeks_used)) then
        v_plan := array_append(v_plan, 'weekly');
        v_weeks_used := array_append(v_weeks_used, v_week);
      elsif v_tokens_left > 0 then
        v_plan := array_append(v_plan, 'token');
        v_tokens_left := v_tokens_left - 1;
      else
        v_plan := null;
        exit;
      end if;
    end loop;

    if v_plan is not null then
      for i in 1 .. array_length(v_missing, 1) loop
        insert into public.streak_freezes (user_id, freeze_date, source, auto)
        values (v_uid, v_missing[i], v_plan[i], true);
        v_frozen := v_frozen || to_jsonb(v_missing[i]);
      end loop;
      if v_tokens_left <> coalesce(v_tokens, 0) then
        update public.profiles set freeze_tokens = v_tokens_left where id = v_uid;
      end if;
      continue;
    end if;

    update public.streaks set current_count = 0 where habit_id = v_row.habit_id;
    v_xp_loss := v_xp_loss + least(v_row.current_count * 2, 100);
    v_gold_loss := v_gold_loss + least(v_row.current_count, 50);
    v_broken := v_broken || jsonb_build_object('habit_id', v_row.habit_id, 'was_count', v_row.current_count);
  end loop;

  if v_xp_loss > 0 or v_gold_loss > 0 then
    perform public.award(v_uid, -v_xp_loss, -v_gold_loss);
  end if;

  return json_build_object('broken', v_broken, 'xp_loss', v_xp_loss, 'gold_loss', v_gold_loss,
                           'auto_frozen', v_frozen);
end;
$$;
