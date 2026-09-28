-- Players start at level 1 (level 0 read as "nothing yet"), and levels keep
-- going past the table: the Legend rank (level 11) was unreachable because
-- level_for_xp stopped at 10. Mirrors getLevelForXp in game-config.ts.
-- See docs/adr/010-ux-review-fixes.md.

create or replace function public.level_for_xp(p_xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_xp >= 6000 then 11 + (p_xp - 6000) / 2000
    else (select count(*)::integer
          from unnest(array[0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000]) as t(threshold)
          where p_xp >= threshold)
  end;
$$;

-- Legacy server-only RPCs used their own 0-based level loops: route them
-- through award() so every level comes from level_for_xp.
create or replace function public.increment_xp(user_id uuid, xp_amount integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.assert_caller_is(increment_xp.user_id);
  perform public.award(increment_xp.user_id, xp_amount, 0);
end;
$$;

create or replace function public.apply_punishment(p_user_id uuid, p_xp_loss integer, p_gold_loss integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.assert_caller_is(p_user_id);
  perform public.award(p_user_id, -p_xp_loss, -p_gold_loss);
end;
$$;

-- Existing profiles move to the new scale.
update public.profiles
set level = public.level_for_xp(xp),
    rank = public.rank_for_level(public.level_for_xp(xp));

alter table public.profiles alter column level set default 1;
