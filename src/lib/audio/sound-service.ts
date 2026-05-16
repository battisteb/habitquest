import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { storage } from '../storage/mmkv';
import { SFX_ASSETS, MUSIC_ASSETS } from './sound-registry';

export type SfxKey =
  | 'complete'
  | 'level_up'
  | 'streak_milestone'
  | 'coin'
  | 'attack'
  | 'victory'
  | 'defeat';

export type MusicKey = 'duel';

const SFX_PREF_KEY = 'audio-sfx-enabled';
const MUSIC_PREF_KEY = 'audio-music-enabled';

export function isSfxEnabled(): boolean {
  return storage.getString(SFX_PREF_KEY) !== 'false';
}

export function isMusicEnabled(): boolean {
  return storage.getString(MUSIC_PREF_KEY) !== 'false';
}

export function setSfxEnabled(enabled: boolean): void {
  storage.set(SFX_PREF_KEY, enabled ? 'true' : 'false');
}

export function setMusicEnabled(enabled: boolean): void {
  storage.set(MUSIC_PREF_KEY, enabled ? 'true' : 'false');
  if (!enabled) stopMusic();
}

let audioModeReady = false;
async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
    audioModeReady = true;
  } catch {
    // ignore
  }
}

const sfxPlayers = new Map<SfxKey, AudioPlayer>();

export async function playSfx(key: SfxKey, volume: number = 1.0): Promise<void> {
  if (!isSfxEnabled()) return;
  const source = SFX_ASSETS[key];
  if (source == null) return;

  try {
    await ensureAudioMode();
    let player = sfxPlayers.get(key);
    if (!player) {
      player = createAudioPlayer(source);
      sfxPlayers.set(key, player);
    }
    player.volume = volume;
    player.seekTo(0);
    player.play();
  } catch {
    // ignore — audio is non-critical
  }
}

let musicPlayer: AudioPlayer | null = null;
let currentMusicKey: MusicKey | null = null;

export async function playMusic(key: MusicKey, volume: number = 0.4): Promise<void> {
  if (!isMusicEnabled()) return;
  if (currentMusicKey === key && musicPlayer?.playing) return;

  const source = MUSIC_ASSETS[key];
  if (source == null) return;

  try {
    await ensureAudioMode();
    stopMusic();
    musicPlayer = createAudioPlayer(source);
    musicPlayer.loop = true;
    musicPlayer.volume = volume;
    musicPlayer.play();
    currentMusicKey = key;
  } catch {
    // ignore
  }
}

export function stopMusic(): void {
  try {
    musicPlayer?.pause();
    musicPlayer?.remove();
  } catch {
    // ignore
  }
  musicPlayer = null;
  currentMusicKey = null;
}
