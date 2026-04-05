-- Migration: achievements system
-- Badges/achievements unlocked by hitting milestones

-- =============================================================================
-- 1. Achievement definitions
-- =============================================================================

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text not null,
  category text not null
    check (category in ('streak', 'completion', 'xp', 'social', 'shop', 'special')),
  icon text not null default '',
  threshold integer not null default 1,
  xp_reward integer not null default 0,
  gold_reward integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.achievements enable row level security;

create policy "Achievements are publicly readable"
  on public.achievements for select
  using (true);

-- =============================================================================
-- 2. User unlocked achievements
-- =============================================================================

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create index idx_user_achievements_user on public.user_achievements(user_id);

alter table public.user_achievements enable row level security;

create policy "Users can view own achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

create policy "Users can view others achievements"
  on public.user_achievements for select
  using (true);

create policy "System can insert achievements"
  on public.user_achievements for insert
  with check (auth.uid() = user_id);

-- =============================================================================
-- 3. Seed achievements
-- =============================================================================

insert into public.achievements (key, name, description, category, icon, threshold, xp_reward, gold_reward) values
  -- Streak achievements
  ('streak_3', 'Consistent', 'Reach a 3-day streak', 'streak', 'fire', 3, 20, 5),
  ('streak_7', 'Weekly Warrior', 'Reach a 7-day streak', 'streak', 'fire', 7, 50, 15),
  ('streak_14', 'Fortnight Fighter', 'Reach a 14-day streak', 'streak', 'fire', 14, 100, 30),
  ('streak_30', 'Monthly Master', 'Reach a 30-day streak', 'streak', 'fire', 30, 200, 75),
  ('streak_100', 'Centurion', 'Reach a 100-day streak', 'streak', 'fire', 100, 500, 200),
  -- Completion achievements
  ('complete_1', 'First Step', 'Complete your first habit', 'completion', 'check', 1, 10, 2),
  ('complete_10', 'Getting Going', 'Complete 10 habits total', 'completion', 'check', 10, 30, 10),
  ('complete_50', 'Dedicated', 'Complete 50 habits total', 'completion', 'check', 50, 75, 25),
  ('complete_100', 'Habit Machine', 'Complete 100 habits total', 'completion', 'check', 100, 150, 50),
  ('complete_500', 'Unstoppable', 'Complete 500 habits total', 'completion', 'check', 500, 500, 200),
  -- XP achievements
  ('xp_100', 'XP Newbie', 'Earn 100 XP total', 'xp', 'star', 100, 0, 5),
  ('xp_500', 'XP Hunter', 'Earn 500 XP total', 'xp', 'star', 500, 0, 15),
  ('xp_1000', 'XP Veteran', 'Earn 1000 XP total', 'xp', 'star', 1000, 0, 30),
  ('xp_5000', 'XP Legend', 'Earn 5000 XP total', 'xp', 'star', 5000, 0, 100),
  -- Social achievements
  ('friend_1', 'Social Butterfly', 'Add your first friend', 'social', 'users', 1, 15, 5),
  ('friend_5', 'Party Leader', 'Have 5 friends', 'social', 'users', 5, 50, 20),
  ('challenge_1', 'Challenger', 'Complete your first challenge', 'social', 'swords', 1, 25, 10),
  ('challenge_win_1', 'Victor', 'Win your first challenge', 'social', 'trophy', 1, 50, 25),
  -- Shop achievements
  ('buy_1', 'Shopper', 'Buy your first item', 'shop', 'bag', 1, 10, 0),
  ('buy_5', 'Collector', 'Own 5 items', 'shop', 'bag', 5, 30, 0),
  ('equip_full', 'Fully Equipped', 'Equip items in all 4 slots', 'shop', 'shield', 4, 50, 15),
  -- Special
  ('level_5', 'Apprentice Rising', 'Reach level 5', 'special', 'arrow-up', 5, 0, 20),
  ('level_10', 'Champion Path', 'Reach level 10', 'special', 'arrow-up', 10, 0, 50);
