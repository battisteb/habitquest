/**
 * Contextual Modes — temporarily adjust which habit categories are active.
 *
 * A mode has:
 * - A name and description
 * - focusCategories: only these categories are shown / count in Today
 * - pauseCategories: these categories are auto-paused (streak protected)
 * - An expiry date (stored in MMKV)
 */
import { storage } from '../../../lib/storage/mmkv';

const MODE_KEY = 'contextual-mode';

export type ContextualModeKey = 'exam' | 'competition' | 'vacation' | 'none';

export interface ContextualMode {
  key: ContextualModeKey;
  name: string;
  emoji: string;
  description: string;
  focusCategories: string[];   // show + track only these
  pauseCategories: string[];   // auto-pause (streak-protected)
  durationDays: number;
}

export const MODES: ContextualMode[] = [
  {
    key: 'exam',
    name: 'Exam Mode',
    emoji: '📚',
    description: 'Focus on learning & mindfulness. Everything else is paused.',
    focusCategories: ['learning', 'studies', 'mindfulness', 'sleep', 'nutrition'],
    pauseCategories: ['fitness', 'sport', 'social', 'creativity'],
    durationDays: 7,
  },
  {
    key: 'competition',
    name: 'Competition Mode',
    emoji: '🏆',
    description: 'Peak performance: fitness & sleep only. All others paused.',
    focusCategories: ['fitness', 'sport', 'sleep', 'nutrition', 'health'],
    pauseCategories: ['learning', 'studies', 'social', 'creativity', 'mindfulness'],
    durationDays: 7,
  },
  {
    key: 'vacation',
    name: 'Vacation Mode',
    emoji: '🌴',
    description: 'Light load: mindfulness & general only. Streaks are frozen.',
    focusCategories: ['mindfulness', 'general', 'social', 'creativity'],
    pauseCategories: ['fitness', 'sport', 'learning', 'studies', 'productivity'],
    durationDays: 14,
  },
];

interface ActiveMode {
  key: ContextualModeKey;
  activatedAt: string;
  expiresAt: string;
}

export function getActiveMode(): ActiveMode | null {
  const raw = storage.getString(MODE_KEY);
  if (!raw) return null;
  try {
    const mode = JSON.parse(raw) as ActiveMode;
    if (new Date(mode.expiresAt) < new Date()) {
      storage.delete(MODE_KEY);
      return null;
    }
    return mode;
  } catch {
    return null;
  }
}

export function activateMode(key: ContextualModeKey): void {
  const def = MODES.find((m) => m.key === key);
  if (!def) return;

  const now = new Date();
  const expires = new Date();
  expires.setDate(expires.getDate() + def.durationDays);

  const mode: ActiveMode = {
    key,
    activatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  storage.set(MODE_KEY, JSON.stringify(mode));
}

export function deactivateMode(): void {
  storage.delete(MODE_KEY);
}

export function getModeDefinition(key: ContextualModeKey): ContextualMode | undefined {
  return MODES.find((m) => m.key === key);
}

/**
 * Returns true if the habit's category should be shown today
 * given the active contextual mode.
 */
export function isHabitActiveInMode(
  category: string,
  activeMode: ActiveMode | null,
): boolean {
  if (!activeMode) return true;
  const def = getModeDefinition(activeMode.key);
  if (!def) return true;
  // If it's in pauseCategories → hide it
  if (def.pauseCategories.includes(category)) return false;
  return true;
}

export function getRemainingDays(activeMode: ActiveMode): number {
  const diff = new Date(activeMode.expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}
