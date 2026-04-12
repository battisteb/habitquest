-- Add a freeze token to a user's profile (used after watching a rewarded ad)
create or replace function public.add_freeze_token(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  v_current integer;
  v_max integer := 1; -- Free tier max; will be checked client-side too
begin
  select freeze_tokens into v_current
  from public.profiles where id = p_user_id;

  if v_current is null then
    v_current := 0;
  end if;

  -- Cap at 3 (premium max) to prevent abuse
  if v_current < 3 then
    update public.profiles
    set freeze_tokens = v_current + 1
    where id = p_user_id;
  end if;
end;
$$;
