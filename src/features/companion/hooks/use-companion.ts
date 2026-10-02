import { useRouter } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { habitsStore$ } from '../../habits/stores/habits-store';
import { premium$ } from '../../monetization/stores/premium';
import { showDialog } from '../../../lib/app-alert';
import { useT } from '../../../lib/i18n';
import type { CompanionStage } from '../sprites';
import { bestCurrentStreak, companionStage, nextStageStreak } from '../utils/companion-stage';

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
    showDialog(
      name,
      next === null
        ? T.companion_max.replace('{n}', String(streak))
        : T.companion_next.replace('{n}', String(streak)).replace('{next}', String(next)),
    );
  };

  return {
    stage,
    streak,
    locked: !isPremium,
    label: isPremium ? name : T.companion_locked,
    onPress,
  };
}
