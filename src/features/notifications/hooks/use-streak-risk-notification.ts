import { useEffect } from 'react';
import { habitsStore$ } from '../../habits/stores/habits-store';
import { isStreakActive } from '../../habits/utils/streak-calculator';
import {
  getNotificationPrefs,
  scheduleStreakRiskReminder,
  cancelStreakRiskReminder,
} from '../utils/notification-service';

/**
 * Schedules a streak-risk notification at 8 PM if there are
 * uncompleted habits with active streaks. Called from the today screen.
 */
export function useStreakRiskNotification(): void {
  useEffect(() => {
    const prefs = getNotificationPrefs();
    if (!prefs.streakRiskEnabled) return;

    const habits = habitsStore$.habits.get();
    const streaks = habitsStore$.streaks.get();
    const todayCompletions = habitsStore$.todayCompletions.get();

    const uncompleted = habits.filter((h) => !todayCompletions[h.id]);
    const atRisk = uncompleted.filter((h) => {
      const streak = streaks[h.id];
      return streak && streak.current_count > 0 && isStreakActive(streak.last_completed_at);
    });

    if (atRisk.length > 0) {
      scheduleStreakRiskReminder(uncompleted.length, atRisk.length);
    } else {
      cancelStreakRiskReminder();
    }
  });
}
