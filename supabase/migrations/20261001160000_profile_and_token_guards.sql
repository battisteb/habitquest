-- Security pass (docs/review/2026-10-revue-app.md):
-- 1. profiles: players may update username, colors and theme directly, but
--    only the app checked the values; any name (length, spaces, look-alikes)
--    or color string could be written through the API.
-- 2. add_freeze_token (a token earned by watching an ad) capped everyone at 3,
--    the Premium cap: free players could hold 3 without the ads. The cap now
--    follows LIMITS.FREE_MAX_FREEZE_TOKENS / PREMIUM_MAX_FREEZE_TOKENS.
--    Known limit: the ad itself is not verified by the server.

create or replace function public.guard_profile_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Security invoker: only writes coming straight from the app are checked.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.username is distinct from old.username and new.username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Hero names are 3 to 20 letters, digits or _' using errcode = '22023';
  end if;
  if new.skin_color !~ '^#[0-9a-fA-F]{6}$' or new.hair_color !~ '^#[0-9a-fA-F]{6}$'
     or new.eye_color !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'Colors are #rrggbb' using errcode = '22023';
  end if;
  -- App themes, plus the theme_* keys of the shop items (see Q15 in PLAN.md).
  if new.active_theme !~ '^(default|medieval|cyberpunk|nature|lifestyle|theme_[a-z]+)$' then
    raise exception 'Unknown theme' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_writes on public.profiles;
create trigger guard_profile_writes
  before update on public.profiles
  for each row execute function public.guard_profile_writes();

create or replace function public.add_freeze_token(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_current integer;
  v_cap integer;
begin
  perform public.assert_caller_is(p_user_id);

  select coalesce(freeze_tokens, 0),
         case when subscription_status = 'premium' then 3 else 1 end
  into v_current, v_cap
  from public.profiles where id = p_user_id
  for update;

  if v_current < v_cap then
    update public.profiles set freeze_tokens = v_current + 1 where id = p_user_id;
  end if;
end;
$$;
