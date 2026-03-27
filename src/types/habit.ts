import type { HabitCategory } from '../lib/constants/categories';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  category: HabitCategory;
  frequency: 'daily';
  is_archived: boolean;
  created_at: string;
}

export interface Completion {
  id: string;
  habit_id: string;
  completed_at: string;
  xp_earned: number;
}

export interface Streak {
  id: string;
  habit_id: string;
  current_count: number;
  longest_count: number;
  last_completed_at: string | null;
}
