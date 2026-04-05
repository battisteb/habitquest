-- Atomically deduct XP and gold (floors at 0) and recalculate level/rank
create or replace function public.apply_punishment(p_user_id uuid, p_xp_loss integer, p_gold_loss integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  new_xp integer;
  new_level integer;
  new_rank text;
  thresholds integer[] := array[0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000];
begin
  -- Deduct XP (floor at 0)
  update public.profiles
  set xp = greatest(0, xp - p_xp_loss),
      gold = greatest(0, gold - p_gold_loss)
  where id = p_user_id
  returning xp into new_xp;

  -- Recalculate level
  new_level := 0;
  for i in 1..array_length(thresholds, 1) loop
    if new_xp >= thresholds[i] then
      new_level := i - 1;
    end if;
  end loop;

  -- Recalculate rank
  case
    when new_level <= 2  then new_rank := 'Novice';
    when new_level <= 4  then new_rank := 'Apprentice';
    when new_level <= 6  then new_rank := 'Warrior';
    when new_level <= 8  then new_rank := 'Knight';
    when new_level <= 10 then new_rank := 'Champion';
    else                      new_rank := 'Legend';
  end case;

  update public.profiles
  set level = new_level,
      rank  = new_rank
  where id = p_user_id;
end;
$$;
