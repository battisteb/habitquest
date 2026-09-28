-- Recent Supabase projects no longer grant table privileges to the API roles
-- automatically. In production, anon/authenticated/service_role had no
-- privilege on any public table, so the app and the Edge Functions could not
-- read or write anything. Grant explicitly what each role needs; RLS still
-- decides which rows. See docs/adr/009-explicit-api-grants.md.

grant usage on schema public to anon, authenticated, service_role;

-- Server code (Edge Functions) uses the service role.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- Signed-in players: read everything their RLS policies allow...
grant select on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ...and write only the tables the app edits directly (RLS + guard triggers).
grant insert, update, delete on public.habits to authenticated;
grant insert, update, delete on public.friendships to authenticated;
grant insert, update on public.challenges to authenticated;
grant insert, update on public.duels to authenticated;
grant insert, update, delete on public.equipped_items to authenticated;
grant insert on public.user_achievements to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant update (username, skin_color, hair_color, eye_color, active_theme)
  on public.profiles to authenticated;

-- Everything else (completions, streaks, quests, freezes, purchases, push
-- tokens, notifications creation, catalogues) goes through security definer
-- RPCs only. anon gets no table access: every screen requires a session.
