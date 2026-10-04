/**
 * The single Pause (D3). Pausing is always server-side (habits.is_paused):
 * process_streak_breaks skips paused quests and resuming keeps the streak
 * (migration 20261004160000). The former focus modes become shortcuts that
 * pick the quests of a few categories.
 */
export const PAUSE_PRESETS = {
  // Exams: keep learning, sleep and calm; pause the rest.
  exam: ['fitness', 'social', 'creativity'],
  // Competition: keep training and recovery; pause the rest.
  competition: ['learning', 'social', 'creativity', 'mindfulness'],
} as const satisfies Record<string, readonly string[]>;
export type PausePreset = keyof typeof PAUSE_PRESETS;

/**
 * Quests to suggest pausing when the burnout banner sends the player here:
 * the two least done this week (they weigh the most right now).
 */
export function pauseSuggestions(
  habits: { id: string; frequency: string }[],
  weekCompletions: Record<string, number>,
  weeklyTarget: (frequency: string) => number,
  count = 2,
): string[] {
  return [...habits]
    .map((h) => {
      const target = weeklyTarget(h.frequency);
      return { id: h.id, ratio: target > 0 ? (weekCompletions[h.id] ?? 0) / target : 1 };
    })
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, count)
    .map((h) => h.id);
}

/** Categories whose quests are all paused: their missions are paused too. */
export function fullyPausedCategories(habits: { category: string; is_paused?: boolean; is_archived?: boolean }[]): string[] {
  const byCat = new Map<string, boolean>();
  for (const h of habits) {
    if (h.is_archived) continue;
    byCat.set(h.category, (byCat.get(h.category) ?? true) && !!h.is_paused);
  }
  return [...byCat].filter(([, all]) => all).map(([c]) => c);
}
