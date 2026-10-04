/** The banners that can show on Today, most important first (D4). */
export type TodayBanner = 'broken' | 'comeback' | 'trial' | 'burnout';

const PRIORITY: TodayBanner[] = ['broken', 'comeback', 'trial', 'burnout'];

/**
 * Today shows one banner at a time (Battiste, D4): a broken streak first
 * (it can be repaired), then the comeback bonus, the free trial, burnout.
 * The next one appears once the first is closed or over.
 */
export function pickTodayBanner(active: Partial<Record<TodayBanner, boolean>>): TodayBanner | null {
  return PRIORITY.find((b) => active[b]) ?? null;
}
