-- No pay-to-win (I3, Battiste 2026-10-02; ADR 017 amended). Epic and
-- legendary items are reserved to Premium players, so their combat bonus is
-- capped at the rare level: they stay a cosmetic upgrade (looks, not power).
-- Best possible equipment: 3/3/3 points instead of 5/5/5, i.e. at most +12
-- arena attack and +12 defense, +9 % / -9 % damage and +12 HP in duels.

create or replace function public.gear_points(p_rarity text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_rarity
    when 'common' then 1 when 'uncommon' then 2
    when 'rare' then 3 when 'epic' then 3 when 'legendary' then 3 else 0 end;
$$;
