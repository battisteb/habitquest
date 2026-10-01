/**
 * Support messages: sent with context for the team, errors explained.
 * Server rules (RLS, status, daily limit) are in supabase/tests/support.test.sql.
 */

const mockInsert = jest.fn();
const mockRows: unknown[] = [];

jest.mock('../../../lib/supabase/client', () => ({
  supabase: {
    from: () => {
      const chain: any = {
        insert: (row: unknown) => mockInsert(row),
        select: jest.fn(() => chain),
        order: jest.fn(() => chain),
        limit: jest.fn(() => Promise.resolve({ data: mockRows, error: null })),
      };
      return chain;
    },
  },
}));
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }));

import { sendSupportMessage, fetchMySupportMessages } from '../support-service';

describe('support service', () => {
  beforeEach(() => mockInsert.mockReset());

  it('sends the trimmed message with platform, version and language', async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    await expect(sendSupportMessage('bug', '  The shop is empty  ')).resolves.toBeNull();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'bug', message: 'The shop is empty', app_version: '1.0.0' }),
    );
    const row = mockInsert.mock.calls[0][0];
    expect(typeof row.platform).toBe('string');
    expect(['fr', 'en']).toContain(row.language);
  });

  it('refuses a message that is too short without calling the server', async () => {
    await expect(sendSupportMessage('idea', ' hi ')).resolves.toBe('too_short');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('explains the daily limit and network errors', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'Too many support messages today' } });
    await expect(sendSupportMessage('bug', 'Still broken')).resolves.toBe('limit');
    mockInsert.mockResolvedValueOnce({ error: { message: 'Failed to fetch' } });
    await expect(sendSupportMessage('bug', 'Still broken')).resolves.toBe('network');
  });

  it("lists the player's messages with the team's status", async () => {
    mockRows.push({ id: '1', category: 'idea', message: 'Dark mode', status: 'read', created_at: '2026-10-01T08:00:00Z' });
    await expect(fetchMySupportMessages()).resolves.toEqual([
      { id: '1', category: 'idea', message: 'Dark mode', status: 'read', createdAt: '2026-10-01T08:00:00Z' },
    ]);
  });
});
