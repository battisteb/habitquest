/**
 * Audio asset registry.
 *
 * To enable a sound, drop the corresponding .mp3/.wav file in assets/sounds/
 * and uncomment the matching require() line.
 *
 * Recommended sources for free chiptune/8-bit SFX:
 *   - https://freesound.org (search "8-bit", "chiptune")
 *   - https://pixabay.com/sound-effects/
 *   - https://opengameart.org
 *
 * Keep files small (< 100 KB for SFX, < 500 KB for music).
 */

import type { SfxKey, MusicKey } from './sound-service';

export const SFX_ASSETS: Partial<Record<SfxKey, number>> = {
  // complete: require('../../../assets/sounds/complete.mp3'),
  // level_up: require('../../../assets/sounds/level-up.mp3'),
  // streak_milestone: require('../../../assets/sounds/streak-milestone.mp3'),
  // coin: require('../../../assets/sounds/coin.mp3'),
  // attack: require('../../../assets/sounds/attack.mp3'),
  // victory: require('../../../assets/sounds/victory.mp3'),
  // defeat: require('../../../assets/sounds/defeat.mp3'),
};

export const MUSIC_ASSETS: Partial<Record<MusicKey, number>> = {
  // duel: require('../../../assets/sounds/duel-music.mp3'),
};
