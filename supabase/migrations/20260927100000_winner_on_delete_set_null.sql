-- Account deletion (App Store 5.1.1(v)) removes the auth user, which cascades to
-- profiles and every user-owned row. winner_id was the only profile reference
-- without an ON DELETE rule: make it explicit so deleting a profile never fails.

alter table public.challenges
  drop constraint if exists challenges_winner_id_fkey,
  add constraint challenges_winner_id_fkey
    foreign key (winner_id) references public.profiles(id) on delete set null;

alter table public.duels
  drop constraint if exists duels_winner_id_fkey,
  add constraint duels_winner_id_fkey
    foreign key (winner_id) references public.profiles(id) on delete set null;
