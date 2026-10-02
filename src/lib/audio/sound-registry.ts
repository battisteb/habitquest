/**
 * Audio asset registry.
 *
 * All sounds are CC0 (public domain).
 *
 * Sources:
 *   - SFX (complete, coin, attack): Kenney UI / RPG packs (https://kenney.nl)
 *   - Jingles (victory, defeat, streak-milestone): Kenney Music Jingles
 *   - Duel music: "Chiptune Battle Music" by oglsdl on OpenGameArt.org (CC0)
 *   - all-done, tap: made for HabitQuest (synthesized with ffmpeg, no third-party audio)
 *   - level-up, mission-done, missions-all, reward-coins: made for HabitQuest
 *     (scripts/sounds/make_sfx.py, no third-party audio)
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
  all_done: require('../../../assets/sounds/all-done.m4a'),
  tap: require('../../../assets/sounds/tap.m4a'),
  mission_done: require('../../../assets/sounds/mission-done.m4a'),
  missions_all: require('../../../assets/sounds/missions-all.m4a'),
  reward_coins: require('../../../assets/sounds/reward-coins.m4a'),
};

export const MUSIC_ASSETS: Partial<Record<MusicKey, number>> = {
  duel: require('../../../assets/sounds/duel-music.m4a'),
};
