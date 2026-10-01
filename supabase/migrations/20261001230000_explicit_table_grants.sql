-- Table privileges for players, stated explicitly.
--
-- Production does not give new tables to anon/authenticated by default (a
-- platform setting), so every table only has the privileges granted on
-- purpose (ADR 009). A fresh database (supabase db start, CI, a new project)
-- gives everything to everyone by default, so the same migrations produced
-- a looser schema: direct purchase inserts, readable arena tables… This
-- migration resets every public table to exactly what production has
-- (exported on 2026-10-01); it changes nothing in production.

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;

revoke all on table public.achievements, public.arena_fights, public.arena_groups, public.arena_members, public.arena_players, public.challenges, public.completions, public.coop_challenges, public.coop_members, public.daily_quest_templates, public.duels, public.equipped_items, public.friendships, public.habits, public.invite_codes, public.notifications, public.profiles, public.purchases, public.push_tokens, public.shop_items, public.streak_freezes, public.streaks, public.support_messages, public.user_achievements, public.user_daily_quests from anon, authenticated;

grant select on public.achievements to authenticated;
grant insert, select, update on public.challenges to authenticated;
grant select on public.completions to authenticated;
grant select on public.daily_quest_templates to authenticated;
grant insert, select, update on public.duels to authenticated;
grant delete, insert, select, update on public.equipped_items to authenticated;
grant delete, insert, select, update on public.friendships to authenticated;
grant delete, insert, select, update on public.habits to authenticated;
grant select on public.invite_codes to authenticated;
grant select on public.notifications to authenticated;
grant select on public.purchases to authenticated;
grant select on public.push_tokens to authenticated;
grant select on public.shop_items to authenticated;
grant select on public.streak_freezes to authenticated;
grant select on public.streaks to authenticated;
grant insert, select on public.support_messages to authenticated;
grant select on public.user_achievements to authenticated;
grant select on public.user_daily_quests to authenticated;

grant update (is_read) on public.notifications to authenticated;
grant select (active_theme, best_streak, created_at, eye_color, gold, hair_color, id, level, rank, skin_color, username, xp) on public.profiles to authenticated;
grant update (active_theme, eye_color, hair_color, language, skin_color, username) on public.profiles to authenticated;
