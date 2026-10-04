import { observable } from '@legendapp/state';

// 7, 21 and 66 are also identity milestones (G3, habits/utils/identity.ts).
export const STREAK_MILESTONES = [7, 14, 21, 30, 60, 66, 100, 365] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

interface StreakMilestoneState {
  visible: boolean;
  streakCount: number;
  habitName: string;
  category: string;
  /** First time this quest reaches an identity stage: announce the new title. */
  newIdentity: boolean;
}

export const streakMilestoneStore$ = observable<StreakMilestoneState>({
  visible: false,
  streakCount: 0,
  habitName: '',
  category: 'general',
  newIdentity: false,
});

export function triggerStreakMilestone(
  streakCount: number,
  habitName: string,
  identity: { category?: string; newIdentity?: boolean } = {},
) {
  streakMilestoneStore$.streakCount.set(streakCount);
  streakMilestoneStore$.habitName.set(habitName);
  streakMilestoneStore$.category.set(identity.category ?? 'general');
  streakMilestoneStore$.newIdentity.set(identity.newIdentity ?? false);
  streakMilestoneStore$.visible.set(true);
}

export function dismissStreakMilestone() {
  streakMilestoneStore$.visible.set(false);
}

export function isMilestone(count: number): boolean {
  return (STREAK_MILESTONES as readonly number[]).includes(count);
}
