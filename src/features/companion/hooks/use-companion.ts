import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { fetchHabits, habitsStore$ } from '../../habits/stores/habits-store';
import { premium$ } from '../../monetization/stores/premium';
import { showDialog } from '../../../lib/app-alert';
import { useT } from '../../../lib/i18n';
import type { CompanionStage } from '../sprites';
import { COMPANION_ASSIST, bestCurrentStreak, companionStage, nextStageStreak } from '../utils/companion-stage';

export interface CompanionState {
  stage: CompanionStage;
  streak: number;
  locked: boolean;
  label: string;
  onPress: () => void;
}

/**
 * The Premium companion of the signed-in player: its stage follows the best
 * current streak of the active habits. Free players get a locked egg that
 * opens the Premium screen.
 */
export function useCompanion(): CompanionState {
  const T = useT();
  const router = useRouter();
  const isPremium = use$(premium$);
  const habits = use$(habitsStore$.habits);
  const streaks = use$(habitsStore$.streaks);

  // The app opens on the profile, before Today loads the habits: load them
  // here too, or the companion would show an egg (and not help in duels).
  const loaded = habits.length > 0;
  useEffect(() => {
    if (!loaded) void fetchHabits();
  }, [loaded]);

  const active = new Set(habits.filter((h) => !h.is_archived).map((h) => h.id));
  const streak = bestCurrentStreak(Object.entries(streaks).filter(([id]) => active.has(id)).map(([, s]) => s));
  const stage = companionStage(streak);
  const name = T[`companion_${stage}` as keyof typeof T] as string;
  const next = nextStageStreak(streak);

  const onPress = () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    const growth = next === null
      ? T.companion_max.replace('{n}', String(streak))
      : T.companion_next.replace('{n}', String(streak)).replace('{next}', String(next));
    const assist = COMPANION_ASSIST[stage];
    showDialog(name, assist > 0 ? `${growth}
${T.companion_duel.replace('{n}', String(assist))}` : growth);
  };

  return {
    stage,
    streak,
    locked: !isPremium,
    label: isPremium ? name : T.companion_locked,
    onPress,
  };
}
