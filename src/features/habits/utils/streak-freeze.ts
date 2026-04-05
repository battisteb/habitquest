import { storage } from '../../../lib/storage/mmkv';

const FREEZE_KEY = 'streak-freeze';

interface FreezeData {
  lastFreezeDate: string | null;   // ISO date (YYYY-MM-DD) of last freeze used
  weekStart: string | null;        // ISO date of the current tracking week start
  freezesUsedThisWeek: number;
}

const MAX_FREEZES_PER_WEEK = 1;

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // Monday-based week
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function getFreezeData(): FreezeData {
  const raw = storage.getString(FREEZE_KEY);
  if (!raw) return { lastFreezeDate: null, weekStart: null, freezesUsedThisWeek: 0 };
  try {
    return JSON.parse(raw);
  } catch {
    return { lastFreezeDate: null, weekStart: null, freezesUsedThisWeek: 0 };
  }
}

function saveFreezeData(data: FreezeData): void {
  storage.set(FREEZE_KEY, JSON.stringify(data));
}

function getCurrentData(): FreezeData {
  const data = getFreezeData();
  const currentWeek = getWeekStart();

  // Reset counter if new week
  if (data.weekStart !== currentWeek) {
    return {
      ...data,
      weekStart: currentWeek,
      freezesUsedThisWeek: 0,
    };
  }

  return data;
}

export function getFreezesRemaining(): number {
  const data = getCurrentData();
  return Math.max(0, MAX_FREEZES_PER_WEEK - data.freezesUsedThisWeek);
}

export function isFreezeActiveToday(): boolean {
  const data = getCurrentData();
  const today = new Date().toISOString().slice(0, 10);
  return data.lastFreezeDate === today;
}

export function activateFreeze(): boolean {
  const data = getCurrentData();
  const today = new Date().toISOString().slice(0, 10);

  // Already frozen today
  if (data.lastFreezeDate === today) return true;

  // No freezes left this week
  if (data.freezesUsedThisWeek >= MAX_FREEZES_PER_WEEK) return false;

  const updated: FreezeData = {
    lastFreezeDate: today,
    weekStart: data.weekStart ?? getWeekStart(),
    freezesUsedThisWeek: data.freezesUsedThisWeek + 1,
  };

  saveFreezeData(updated);
  return true;
}

export const STREAK_FREEZE_CONFIG = {
  MAX_PER_WEEK: MAX_FREEZES_PER_WEEK,
} as const;
