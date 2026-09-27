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
 * Files are AAC (.m4a): iOS cannot play Ogg Vorbis, and Metro bundles .m4a by default.
 * To add or change a sound, drop the file in assets/sounds/ and add a line below.
 */

import type { SfxKey, MusicKey } from './sound-service';

export const SFX_ASSETS: Partial<Record<SfxKey, number>> = {
  complete: require('../../../assets/sounds/complete.m4a'),
  level_up: require('../../../assets/sounds/level-up.m4a'),
  streak_milestone: require('../../../assets/sounds/streak-milestone.m4a'),
  coin: require('../../../assets/sounds/coin.m4a'),
  attack: require('../../../assets/sounds/attack.m4a'),
  victory: require('../../../assets/sounds/victory.m4a'),
  defeat: require('../../../assets/sounds/defeat.m4a'),
};

export const MUSIC_ASSETS: Partial<Record<MusicKey, number>> = {
  duel: require('../../../assets/sounds/duel-music.m4a'),
};
