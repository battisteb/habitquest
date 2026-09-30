-- Account review (docs/review/2026-10-revue-app.md): picking a hero name that
-- was already taken (or an e-mail whose prefix was) made the whole sign-up
-- fail with an unexplained server error, since profiles.username is unique.
-- The app now checks the name first (username_available), and the server
-- adds a short suffix instead of failing if two sign-ups race.

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(p_username)));
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  -- Same rules as the app (usernameProblem): 3-20 letters, digits or _.
  v_base text := left(regexp_replace(coalesce(nullif(new.raw_user_meta_data ->> 'username', ''),
                                              split_part(new.email, '@', 1)), '[^a-zA-Z0-9_]', '', 'g'), 20);
  v_name text;
begin
  if v_base is null or length(v_base) < 3 then
    v_base := 'hero' || coalesce(v_base, '');
  end if;
  v_name := v_base;
  while exists (select 1 from public.profiles where lower(username) = lower(v_name)) loop
    v_name := left(v_base, 15) || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.profiles (id, username) values (new.id, v_name);
  return new;
end;
$$;
