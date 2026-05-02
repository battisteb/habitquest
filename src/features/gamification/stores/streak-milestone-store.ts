import { observable } from '@legendapp/state';

export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

interface StreakMilestoneState {
  visible: boolean;
  streakCount: number;
  habitName: string;
}

export const streakMilestoneStore$ = observable<StreakMilestoneState>({
  visible: false,
  streakCount: 0,
  habitName: '',
});

export function triggerStreakMilestone(streakCount: number, habitName: string) {
  streakMilestoneStore$.streakCount.set(streakCount);
  streakMilestoneStore$.habitName.set(habitName);
  streakMilestoneStore$.visible.set(true);
}

export function dismissStreakMilestone() {
  streakMilestoneStore$.visible.set(false);
}

export function isMilestone(count: number): boolean {
  return (STREAK_MILESTONES as readonly number[]).includes(count);
}
