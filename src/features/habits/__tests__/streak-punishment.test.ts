/**
 * Streak check: broken streaks and days covered by an automatic freeze.
 * Server rules are in supabase/tests/economy.test.sql.
 */
const mockRpc = jest.fn();
jest.mock('../../../lib/supabase/client', () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));

import { checkAndApplyPunishments } from '../utils/streak-punishment';

describe('checkAndApplyPunishments', () => {
  it('reports the days saved by an automatic freeze', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { broken: [], xp_loss: 0, gold_loss: 0, auto_frozen: ['2026-10-01'] },
      error: null,
    });
    await expect(checkAndApplyPunishments()).resolves.toMatchObject({ brokenCount: 0, autoFrozenDays: ['2026-10-01'] });
  });

  it('reports broken streaks and their penalty', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { broken: [{ habit_id: 'h1', was_count: 10 }], xp_loss: 20, gold_loss: 10, auto_frozen: [] },
      error: null,
    });
    await expect(checkAndApplyPunishments()).resolves.toMatchObject({
      totalXpLoss: 20,
      brokenStreaks: [{ habitId: 'h1', wasCount: 10 }],
      autoFrozenDays: [],
    });
  });

  it('is safe when the server answers nothing', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    await expect(checkAndApplyPunishments()).resolves.toMatchObject({ brokenCount: 0, autoFrozenDays: [] });
  });
});
