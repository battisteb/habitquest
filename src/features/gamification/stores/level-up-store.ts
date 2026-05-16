import { observable } from '@legendapp/state';
import { playSfx } from '../../../lib/audio/sound-service';

interface LevelUpState {
  showLevelUp: boolean;
  newLevel: number;
}

export const levelUpStore$ = observable<LevelUpState>({
  showLevelUp: false,
  newLevel: 0,
});

export function triggerLevelUp(newLevel: number) {
  levelUpStore$.newLevel.set(newLevel);
  levelUpStore$.showLevelUp.set(true);
  void playSfx('level_up');
}

export function dismissLevelUp() {
  levelUpStore$.showLevelUp.set(false);
}
