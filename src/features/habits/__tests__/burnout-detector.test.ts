import { detectBurnoutRisk, BurnoutRisk } from '../utils/burnout-detector';

// Mock supabase client
jest.mock('../../../lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../../../lib/supabase/client';

const mockFrom = supabase.from as jest.Mock;

function buildSelectChain(result: { data?: unknown; count?: number | null; error?: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.in = jest.fn().mockReturnValue(chain);
  chain.gte = jest.fn().mockReturnValue(chain);
  chain.lt = jest.fn().mockReturnValue(chain);
  chain.then = undefined; // not a promise directly

  // Make the chain thenable for await
  const resolved = Promise.resolve(result);
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.in = jest.fn().mockReturnValue(chain);
  chain.gte = jest.fn().mockReturnValue(chain);
  chain.lt = jest.fn().mockReturnValue({
    ...chain,
    then: resolved.then.bind(resolved),
    catch: resolved.catch.bind(resolved),
  });

  return chain;
}

// Helper to set up mock call sequence: habits query, recent count, previous count
function setupMocks(
  habits: { id: string }[],
  recentCount: number,
  previousCount: number,
) {
  let callIndex = 0;
  mockFrom.mockImplementation(() => {
    const call = callIndex++;
    if (call === 0) {
      // habits query
      const chain: Record<string, unknown> = {};
      const resolved = Promise.resolve({ data: habits, error: null });
      const eq1 = jest.fn().mockReturnValue(chain);
      const eq2 = jest.fn().mockReturnValue(chain);
      const eq3 = jest.fn().mockReturnValue({
        then: resolved.then.bind(resolved),
        catch: resolved.catch.bind(resolved),
      });
      chain.select = jest.fn().mockReturnValue(chain);
      chain.eq = eq1.mockReturnValueOnce(chain).mockReturnValueOnce(chain).mockReturnValue({
        then: resolved.then.bind(resolved),
        catch: resolved.catch.bind(resolved),
      });
      return chain;
    }
    if (call === 1) {
      // recent count query
      const resolved = Promise.resolve({ count: recentCount, error: null });
      const chain: Record<string, unknown> = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.in = jest.fn().mockReturnValue(chain);
      chain.gte = jest.fn().mockReturnValue({
        then: resolved.then.bind(resolved),
        catch: resolved.catch.bind(resolved),
      });
      return chain;
    }
    // previous count query
    const resolved = Promise.resolve({ count: previousCount, error: null });
    const chain: Record<string, unknown> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.in = jest.fn().mockReturnValue(chain);
    chain.gte = jest.fn().mockReturnValue(chain);
    chain.lt = jest.fn().mockReturnValue({
      then: resolved.then.bind(resolved),
      catch: resolved.catch.bind(resolved),
    });
    return chain;
  });
}

describe('detectBurnoutRisk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns none when user has no active habits', async () => {
    setupMocks([], 0, 0);
    const signal = await detectBurnoutRisk('user-1');
    expect(signal.risk).toBe<BurnoutRisk>('none');
    expect(signal.message).toBe('');
    expect(signal.suggestion).toBe('');
  });

  it('returns none when there is no significant decline', async () => {
    // 1 habit, recent 12/14, previous 13/14 → decline = 0.071 < 0.1
    setupMocks([{ id: 'h1' }], 12, 13);
    const signal = await detectBurnoutRisk('user-1');
    expect(signal.risk).toBe<BurnoutRisk>('none');
  });

  it('returns mild when decline > 0.1', async () => {
    // 1 habit: recent 8/14 = 0.571, previous 12/14 = 0.857, decline = 0.286 > 0.1
    // recentRate 0.571 >= 0.5 so not moderate/high → mild
    setupMocks([{ id: 'h1' }], 8, 12);
    const signal = await detectBurnoutRisk('user-1');
    expect(signal.risk).toBe<BurnoutRisk>('mild');
    expect(signal.message).toBe('📉 Slight decline');
  });

  it('returns moderate when recentRate < 0.5 and decline > 0.15', async () => {
    // 1 habit: recent 5/14 = 0.357, previous 10/14 = 0.714, decline = 0.357 > 0.15
    // recentRate 0.357 < 0.5 but >= 0.3, not high → moderate
    setupMocks([{ id: 'h1' }], 5, 10);
    const signal = await detectBurnoutRisk('user-1');
    expect(signal.risk).toBe<BurnoutRisk>('moderate');
    expect(signal.message).toBe('😓 Momentum dropping');
  });

  it('returns high when recentRate < 0.3 and decline > 0.2', async () => {
    // 1 habit: recent 3/14 = 0.214, previous 12/14 = 0.857, decline = 0.643 > 0.2
    setupMocks([{ id: 'h1' }], 3, 12);
    const signal = await detectBurnoutRisk('user-1');
    expect(signal.risk).toBe<BurnoutRisk>('high');
    expect(signal.message).toBe('⚠️ Burnout detected');
    expect(signal.suggestion).toBe('Consider taking a rest day or pausing some habits.');
  });

  it('caps rates at 1 when completions exceed maximum possible', async () => {
    // Over-completions should not cause negative decline or wrong classification
    // 1 habit: recent 20/14 capped to 1, previous 14/14 = 1, decline = 0 → none
    setupMocks([{ id: 'h1' }], 20, 14);
    const signal = await detectBurnoutRisk('user-1');
    expect(signal.risk).toBe<BurnoutRisk>('none');
  });
});
