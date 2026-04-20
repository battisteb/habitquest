-- Ensure increment_xp function correctly updates the level column
create or replace function public.increment_xp(user_id uuid, xp_amount integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  new_xp    integer;
  new_level integer := 0;
  thresholds integer[] := array[0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000];
begin
  update public.profiles
    set xp = xp + xp_amount
    where id = user_id
    returning xp into new_xp;

  for i in 1..array_length(thresholds, 1) loop
    if new_xp >= thresholds[i] then
      new_level := i - 1;
    end if;
  end loop;

  update public.profiles
    set level = new_level
    where id = user_id;
end;
$$;

-- One-time data fix: recalculate level for all profiles where it is out of sync
do $$
declare
  thresholds integer[] := array[0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000];
  rec           record;
  correct_level integer;
begin
  for rec in select id, xp from public.profiles loop
    correct_level := 0;
    for i in 1..array_length(thresholds, 1) loop
      if rec.xp >= thresholds[i] then
        correct_level := i - 1;
      end if;
    end loop;
    update public.profiles set level = correct_level where id = rec.id;
  end loop;
end;
$$;
