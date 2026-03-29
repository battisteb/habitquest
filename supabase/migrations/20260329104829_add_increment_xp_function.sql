-- Atomically increment XP for a user and recalculate level
create or replace function public.increment_xp(user_id uuid, xp_amount integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  new_xp integer;
  new_level integer;
  thresholds integer[] := array[0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000];
begin
  -- Increment XP
  update public.profiles
  set xp = xp + xp_amount
  where id = user_id
  returning xp into new_xp;

  -- Calculate level from thresholds
  new_level := 0;
  for i in 1..array_length(thresholds, 1) loop
    if new_xp >= thresholds[i] then
      new_level := i - 1;
    end if;
  end loop;

  -- Update level
  update public.profiles
  set level = new_level
  where id = user_id;
end;
$$;
