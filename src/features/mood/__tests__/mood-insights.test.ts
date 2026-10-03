/**
 * Personal links between quests and the mood of the day (ADR 023).
 */
import { moodInsights, MIN_DAYS_EACH, type MoodLog } from '../utils/mood-insights';

const day = (n: number) => {
  const d = new Date(2026, 8, 1 + n, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const at = (n: number) => new Date(2026, 8, 1 + n, 9).toISOString();

const run = { id: 'run', name: 'Run', emoji: '🏃', frequency: 'daily' };
const read = { id: 'read', name: 'Read', emoji: null, frequency: 'daily' };

describe('moodInsights', () => {
  // 20 days: running on even days, with a better mood those days.
  const moods: MoodLog[] = Array.from({ length: 20 }, (_, n) => ({ day: day(n), mood: n % 2 === 0 ? 4 : 2 }));
  const completions = Array.from({ length: 20 }, (_, n) => n)
    .filter((n) => n % 2 === 0)
    .map((n) => ({ habit_id: 'run', completed_at: at(n) }));

  it('finds the quest that goes with a better mood', () => {
    const [first] = moodInsights([run], completions, moods);
    expect(first).toMatchObject({ habitId: 'run', delta: 2, daysDone: 10, daysMissed: 10 });
  });

  it('says nothing without a clear gap', () => {
    // Reading every other day, but on mixed-mood days: no link.
    const mixed = Array.from({ length: 20 }, (_, n) => n)
      .filter((n) => n % 4 < 2)
      .map((n) => ({ habit_id: 'read', completed_at: at(n) }));
    expect(moodInsights([read], mixed, moods)).toEqual([]);
  });

  it('waits for enough days on both sides', () => {
    const few = moods.slice(0, MIN_DAYS_EACH * 2 - 2);
    expect(moodInsights([run], completions, few)).toEqual([]);
  });

  it('does not count the rest days of a chosen-days quest as missed', () => {
    // Only on Mondays, done every Monday: no "missed" day, so no link.
    const mondays = { id: 'gym', name: 'Gym', frequency: 'days', days: [1] };
    const monCompletions = Array.from({ length: 20 }, (_, n) => n)
      .filter((n) => new Date(2026, 8, 1 + n).getDay() === 1)
      .map((n) => ({ habit_id: 'gym', completed_at: at(n) }));
    expect(moodInsights([mondays], monCompletions, moods)).toEqual([]);
  });
});
