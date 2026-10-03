import { pickTodayBanner } from '../utils/today-banner';

describe('one banner at a time on Today (D4)', () => {
  it('shows nothing when nothing is going on', () => {
    expect(pickTodayBanner({})).toBeNull();
  });

  it('puts a broken streak first, then comeback, trial, burnout', () => {
    expect(pickTodayBanner({ broken: true, comeback: true, trial: true, burnout: true })).toBe('broken');
    expect(pickTodayBanner({ comeback: true, trial: true, burnout: true })).toBe('comeback');
    expect(pickTodayBanner({ trial: true, burnout: true })).toBe('trial');
    expect(pickTodayBanner({ burnout: true })).toBe('burnout');
  });
});
