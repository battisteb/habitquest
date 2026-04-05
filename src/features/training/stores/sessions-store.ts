import { observable } from '@legendapp/state';
import { storage } from '../../../lib/storage/mmkv';
import type { SessionFile, StoredSession } from '../types/session';
import { isValidSessionFile } from '../types/session';

const SESSIONS_KEY = 'training-sessions';

interface SessionsState {
  sessions: StoredSession[];
  isLoading: boolean;
}

export const sessionsStore$ = observable<SessionsState>({
  sessions: [],
  isLoading: false,
});

// ─── Persistence ─────────────────────────────────────────────────────────────

function loadFromStorage(): StoredSession[] {
  const raw = storage.getString(SESSIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredSession[];
  } catch {
    return [];
  }
}

function saveToStorage(sessions: StoredSession[]): void {
  storage.set(SESSIONS_KEY, JSON.stringify(sessions));
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export function loadSessions() {
  sessionsStore$.isLoading.set(true);
  const sessions = loadFromStorage();
  sessionsStore$.sessions.set(sessions);
  sessionsStore$.isLoading.set(false);
}

export function importSession(json: unknown): StoredSession {
  if (!isValidSessionFile(json)) {
    throw new Error('Invalid session format. Check the JSON structure.');
  }
  const data = json as SessionFile;

  const session: StoredSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    importedAt: new Date().toISOString(),
    completedCount: 0,
    lastCompletedAt: null,
    data,
  };

  const existing = loadFromStorage();
  const updated = [...existing, session];
  saveToStorage(updated);
  sessionsStore$.sessions.set(updated);

  return session;
}

export function markSessionCompleted(sessionId: string): void {
  const sessions = loadFromStorage().map((s) => {
    if (s.id !== sessionId) return s;
    return {
      ...s,
      completedCount: s.completedCount + 1,
      lastCompletedAt: new Date().toISOString(),
    };
  });
  saveToStorage(sessions);
  sessionsStore$.sessions.set(sessions);
}

export function deleteSession(sessionId: string): void {
  const sessions = loadFromStorage().filter((s) => s.id !== sessionId);
  saveToStorage(sessions);
  sessionsStore$.sessions.set(sessions);
}
