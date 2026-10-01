-- Puts the LOCAL demo account (PixelHero, created by the local seed) back in a
-- clean, recent state: streaks running up to yesterday, nothing done today,
-- no arena/co-op leftovers. Dates are relative to today, so it can be re-run
-- at any time (screenshots, reels, smoke tests). Never run it against prod.
--
--   docker exec -i supabase_db_<project> psql -U postgres < scripts/demo/reset-local-demo.sql

begin;

do $$
declare
  v_hero uuid := (select id from public.profiles where username = 'PixelHero');
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_habit record;
  k integer;
begin
  if v_hero is null then
    raise exception 'PixelHero not found: run the local seed first';
  end if;

  -- Streak lengths used by the reels (13 → 14-day milestone, 5 → level-up to 6).
  for v_habit in
    select h.id, s.streak
    from public.habits h
    join (values ('Méditer 10 min', 15), ('Lire 20 pages', 14), ('Courir 5 km', 10),
                 ('Pas de réseaux avant 10h', 13), ('Au lit avant minuit', 5)) as s(name, streak)
      on s.name = h.name
    where h.user_id = v_hero
  loop
    delete from public.completions where habit_id = v_habit.id;

    -- The running streak: every day up to yesterday.
    for k in 1..v_habit.streak loop
      insert into public.completions (habit_id, completed_at, xp_earned)
      values (v_habit.id, ((v_today - k) + time '18:00') at time zone 'Europe/Paris', 10);
    end loop;
    -- A year of older history with gaps, getting more regular over time,
    -- so the stats (year in pixels, 12-week trend) look lived-in.
    update public.habits set created_at = now() - interval '370 days' where id = v_habit.id;
    for k in (v_habit.streak + 2)..365 loop
      if (k * 37 + v_habit.streak * 11) % 10 < (case when k > 240 then 5 when k > 120 then 7 else 8 end) then
        insert into public.completions (habit_id, completed_at, xp_earned)
        values (v_habit.id, ((v_today - k) + time '18:00') at time zone 'Europe/Paris', 10);
      end if;
    end loop;

    insert into public.streaks (habit_id, current_count, longest_count, last_completed_at)
    values (v_habit.id, v_habit.streak, greatest(v_habit.streak, 21),
            ((v_today - 1) + time '18:00') at time zone 'Europe/Paris')
    on conflict (habit_id) do update
      set current_count = excluded.current_count,
          longest_count = greatest(public.streaks.longest_count, excluded.current_count),
          last_completed_at = excluded.last_completed_at;
  end loop;

  update public.profiles
  set xp = 1321, level = public.level_for_xp(1321), rank = public.rank_for_level(public.level_for_xp(1321)),
      gold = 535, best_streak = greatest(best_streak, 21), timezone = 'Europe/Paris'
  where id = v_hero;

  -- Today's missions are re-assigned on the next visit.
  delete from public.user_daily_quests where user_id = v_hero;

  -- Arena and co-op leftovers from manual tests.
  delete from public.coop_challenges
  where id in (select challenge_id from public.coop_members where user_id = v_hero);
  delete from public.arena_members where user_id = v_hero;
  delete from public.arena_players where user_id = v_hero;
end $$;

commit;
