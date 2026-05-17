/**
 * Audio asset registry.
 *
 * All sounds are CC0 (public domain).
 *
 * Sources:
 *   - SFX (complete, coin, attack): Kenney UI / RPG packs (https://kenney.nl)
 *   - Jingles (level-up, victory, defeat, streak-milestone): Kenney Music Jingles
 *   - Duel music: "Chiptune Battle Music" by oglsdl on OpenGameArt.org (CC0)
 *
 * To add or change a sound, drop the file in assets/sounds/ and add a line below.
 */

import type { SfxKey, MusicKey } from './sound-service';

export const SFX_ASSETS: Partial<Record<SfxKey, number>> = {
  complete: require('../../../assets/sounds/complete.ogg'),
  level_up: require('../../../assets/sounds/level-up.ogg'),
  streak_milestone: require('../../../assets/sounds/streak-milestone.ogg'),
  coin: require('../../../assets/sounds/coin.ogg'),
  attack: require('../../../assets/sounds/attack.ogg'),
  victory: require('../../../assets/sounds/victory.ogg'),
  defeat: require('../../../assets/sounds/defeat.ogg'),
};

export const MUSIC_ASSETS: Partial<Record<MusicKey, number>> = {
  duel: require('../../../assets/sounds/duel-music.ogg'),
};
