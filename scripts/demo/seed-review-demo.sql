-- App Review demo (PROD, test accounts only): QuestTester (the account given to Apple) and its
-- friend DemoHero, both on the project mailbox / test addresses of .env.deploy.local.
-- Puts them in a lived-in state relative to today: streaks running up to yesterday, nothing done
-- today (the reviewer can complete habits), QuestTester level 6 (duels unlocked at 5), an accepted
-- friendship and one finished duel (rounds produced by src/features/duels/utils/combat-engine.ts).
-- Re-run it right before each submission so the streaks are current. Touches only these two
-- accounts; XP and levels come from the inserted completions through public.level_for_xp.
--
--   SQL editor or Management API (postgres role): run the whole file.

begin;

do $$
declare
  v_qt uuid := (select id from public.profiles where username = 'QuestTester');
  v_dh uuid := (select id from public.profiles where username = 'DemoHero');
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_habit record;
  v_id uuid;
  v_xp integer;
  k integer;
begin
  if v_qt is null or v_dh is null then
    raise exception 'QuestTester or DemoHero not found';
  end if;

  -- Habits (English: the review team reads English), with their running streak.
  for v_habit in
    select * from (values
      (v_qt, 'Meditate 5 minutes', 'mindfulness', '🧘', 'One deep breath', 15),
      (v_qt, 'Drink a glass of water', 'health', '💧', 'A few sips', 12),
      (v_qt, 'Read 10 pages', 'learning', '📚', 'Read 1 page', 9),
      (v_qt, 'Walk 20 minutes', 'fitness', '🚶', 'Walk 5 minutes', 6),
      (v_qt, 'No phone in bed', 'sleep', '📵', 'Phone away 10 minutes', 4),
      (v_qt, 'Stretch 5 minutes', 'fitness', '🤸', 'One stretch', 3),
      (v_dh, 'Morning run', 'fitness', '🏃', 'Run 5 minutes', 7),
      (v_dh, 'Journal one line', 'mindfulness', '📝', 'One word', 5),
      (v_dh, 'Practice guitar', 'learning', '🎸', 'Play one song', 3),
      (v_dh, 'Lights out by 11 pm', 'sleep', '🌙', 'Screens off at 11', 2)
    ) as h(user_id, name, category, emoji, mini, streak)
  loop
    -- Re-runnable: the demo habits are rebuilt from scratch.
    delete from public.completions where habit_id in
      (select id from public.habits where user_id = v_habit.user_id and name = v_habit.name);
    delete from public.streaks where habit_id in
      (select id from public.habits where user_id = v_habit.user_id and name = v_habit.name);
    delete from public.habits where user_id = v_habit.user_id and name = v_habit.name;

    insert into public.habits (user_id, name, category, frequency, emoji, mini, created_at)
    values (v_habit.user_id, v_habit.name, v_habit.category, 'daily', v_habit.emoji, v_habit.mini,
            ((v_today - 32) + time '09:00') at time zone 'Europe/Paris')
    returning id into v_id;

    -- The running streak: every day up to yesterday.
    for k in 1..v_habit.streak loop
      insert into public.completions (habit_id, completed_at, xp_earned)
      values (v_id, ((v_today - k) + time '18:00') at time zone 'Europe/Paris', 10);
    end loop;
    -- Older history with gaps, so the calendar and the stats look lived-in.
    for k in (v_habit.streak + 2)..30 loop
      if k % 3 <> 0 then
        insert into public.completions (habit_id, completed_at, xp_earned)
        values (v_id, ((v_today - k) + time '18:00') at time zone 'Europe/Paris', 10);
      end if;
    end loop;

    -- The streak row is created by the habit trigger (create_streak_for_habit).
    insert into public.streaks (habit_id, current_count, longest_count, last_completed_at)
    values (v_id, v_habit.streak, greatest(v_habit.streak, 14),
            ((v_today - 1) + time '18:00') at time zone 'Europe/Paris')
    on conflict (habit_id) do update
      set current_count = excluded.current_count,
          longest_count = excluded.longest_count,
          last_completed_at = excluded.last_completed_at;
  end loop;

  -- XP = the completions earned, level from the server formula (ADR 010), some gold for the shop.
  foreach v_id in array array[v_qt, v_dh] loop
    select coalesce(sum(c.xp_earned), 0) into v_xp
    from public.completions c join public.habits h on h.id = c.habit_id where h.user_id = v_id;
    update public.profiles
      set xp = v_xp, level = public.level_for_xp(v_xp), gold = case when v_id = v_qt then 240 else 120 end
      where id = v_id;
  end loop;

  -- Friends.
  if not exists (select 1 from public.friendships
                 where (requester_id = v_qt and addressee_id = v_dh) or (requester_id = v_dh and addressee_id = v_qt)) then
    insert into public.friendships (requester_id, addressee_id, status, created_at)
    values (v_dh, v_qt, 'accepted', now() - interval '20 days');
  else
    update public.friendships set status = 'accepted'
    where (requester_id = v_qt and addressee_id = v_dh) or (requester_id = v_dh and addressee_id = v_qt);
  end if;

  -- One finished duel, won by QuestTester (Mind Blast vs Sprint Dash).
  delete from public.duels
  where (challenger_id = v_qt and opponent_id = v_dh) or (challenger_id = v_dh and opponent_id = v_qt);
  insert into public.duels (challenger_id, opponent_id, challenger_attack_id, opponent_attack_id, status, winner_id,
                            rounds, challenger_hp, opponent_hp, loser_xp_bonus, created_at, resolved_at,
                            winner_rewarded, loser_rewarded)
  values (v_qt, v_dh, 'mind_blast', 'sprint', 'resolved', v_qt,
          jsonb_build_array(
            jsonb_build_object('attackerId', v_qt, 'attackName', 'Mind Blast',
              'result', jsonb_build_object('hit', true, 'damage', 20, 'effect', 'Mind Blast hits for 20 damage!', 'shieldApplied', false, 'healAmount', 0),
              'hpAfter', jsonb_build_object(v_qt::text, 100, v_dh::text, 80)),
            jsonb_build_object('attackerId', v_dh, 'attackName', 'Sprint Dash',
              'result', jsonb_build_object('hit', true, 'damage', 13, 'effect', 'Sprint Dash hits for 13 damage!', 'shieldApplied', false, 'healAmount', 0),
              'hpAfter', jsonb_build_object(v_qt::text, 87, v_dh::text, 80))),
          87, 80, 25, now() - interval '1 day 2 hours', now() - interval '1 day', true, true);
end $$;

commit;
