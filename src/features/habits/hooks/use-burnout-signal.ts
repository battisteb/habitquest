import { useState, useEffect } from 'react';
import { authStore$ } from '../../auth/stores/auth-store';
import { detectBurnoutRisk, BurnoutSignal } from '../utils/burnout-detector';

export function useBurnoutSignal(): BurnoutSignal {
  const [signal, setSignal] = useState<BurnoutSignal>({ risk: 'none', message: '', suggestion: '' });

  useEffect(() => {
    const userId = authStore$.user.get()?.id;
    if (!userId) return;
    detectBurnoutRisk(userId).then(setSignal).catch(() => {});
  }, []);

  return signal;
}
