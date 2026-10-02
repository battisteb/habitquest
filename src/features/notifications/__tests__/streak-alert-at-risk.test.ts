import { localDay, usersAtRisk, type AlertHabit } from '../../../../supabase/functions/daily-streak-alert/at-risk';

// Friday 2 October 2026, 20:00 UTC = 22:00 in Paris, already Saturday 05:00 in Tokyo.
const NOW = new Date('2026-10-02T20:00:00Z');

const habit = (over: Partial<AlertHabit>): AlertHabit => ({
  id: 'h', user_id: 'u', frequency: 'daily', days: null, is_archived: false, is_paused: false, current_count: 3, ...over,
});

describe('daily streak alert', () => {
  it('reads the local day and weekday of each player', () => {
    expect(localDay(NOW, 'Europe/Paris')).toEqual({ date: '2026-10-02', weekday: 5 });
    expect(localDay(NOW, 'Asia/Tokyo')).toEqual({ date: '2026-10-03', weekday: 6 });
    expect(localDay(NOW, 'Not/AZone')).toEqual({ date: '2026-10-02', weekday: 5 });
  });

  it('warns a player whose running streak is not done today', () => {
    const at = usersAtRisk([habit({})], [{ id: 'u', timezone: 'Europe/Paris', language: 'fr' }], [], NOW);
    expect([...at]).toEqual(['u']);
  });

  it('counts a completion on the local day, not the UTC one', () => {
    // 22:30 UTC on the 1st is already 00:30 on the 2nd in Paris: done today.
    const done = [{ habit_id: 'h', completed_at: '2026-10-01T22:30:00Z' }];
    expect(usersAtRisk([habit({})], [{ id: 'u', timezone: 'Europe/Paris', language: 'fr' }], done, NOW).size).toBe(0);
  });

  it('skips rest days, weekly quests, paused, archived and empty streaks', () => {
    const profiles = [{ id: 'u', timezone: 'Europe/Paris', language: 'en' }];
    const quiet = [
      habit({ id: 'a', frequency: 'days', days: [1, 3] }),
      habit({ id: 'b', frequency: '3x_week' }),
      habit({ id: 'c', is_paused: true }),
      habit({ id: 'd', is_archived: true }),
      habit({ id: 'e', current_count: 0 }),
    ];
    expect(usersAtRisk(quiet, profiles, [], NOW).size).toBe(0);
    expect(usersAtRisk([habit({ frequency: 'days', days: [5] })], profiles, [], NOW).size).toBe(1);
  });
});
