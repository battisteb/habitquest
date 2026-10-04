/** D6: the sort and category chips of Today appear from this many quests. */
export const LIST_TOOLS_MIN_QUESTS = 6;

export type SortMode = 'smart' | 'streak' | 'az';

/**
 * With few quests, sorting and filters are noise: they are hidden, and a
 * filter or sort chosen earlier no longer applies (nothing hidden that the
 * player could not clear).
 */
export function listTools<C extends string>(
  questCount: number,
  category: C,
  sort: SortMode,
  all: C,
): { show: boolean; category: C; sort: SortMode } {
  const show = questCount >= LIST_TOOLS_MIN_QUESTS;
  return show ? { show, category, sort } : { show, category: all, sort: 'smart' };
}
