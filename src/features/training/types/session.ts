// ─────────────────────────────────────────────────────────────────────────────
// HabitQuest Training Session JSON format v1
//
// Users create these files on their PC and import them via the Training tab.
// All data is stored locally in MMKV — nothing sent to the cloud.
//
// Example JSON:
// {
//   "version": 1,
//   "title": "Full Body A",
//   "category": "fitness",
//   "description": "Push/pull compound movements",
//   "estimated_duration": 45,
//   "exercises": [
//     { "name": "Squat",       "type": "reps",  "sets": 4, "reps": 8,  "rest": 90 },
//     { "name": "Bench Press", "type": "reps",  "sets": 4, "reps": 6,  "rest": 120 },
//     { "name": "Plank",       "type": "timer", "duration": 60, "sets": 3, "rest": 30 }
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────

export type ExerciseType = 'reps' | 'timer';
export type SessionCategory = 'fitness' | 'health' | 'mindfulness' | 'learning' | 'general';

export interface RepsExercise {
  name: string;
  type: 'reps';
  sets: number;
  reps: number;
  rest: number; // seconds between sets
  notes?: string;
}

export interface TimerExercise {
  name: string;
  type: 'timer';
  duration: number; // seconds
  sets: number;
  rest: number; // seconds between sets
  notes?: string;
}

export type Exercise = RepsExercise | TimerExercise;

export interface SessionFile {
  version: 1;
  title: string;
  category: SessionCategory;
  description?: string;
  estimated_duration?: number; // minutes
  exercises: Exercise[];
}

// Stored session — includes local metadata added on import
export interface StoredSession {
  id: string;
  importedAt: string; // ISO date
  completedCount: number;
  lastCompletedAt: string | null;
  data: SessionFile;
}

// Validation
export function isValidSessionFile(json: unknown): json is SessionFile {
  if (typeof json !== 'object' || json === null) return false;
  const obj = json as Record<string, unknown>;
  if (obj.version !== 1) return false;
  if (typeof obj.title !== 'string' || !obj.title.trim()) return false;
  if (!Array.isArray(obj.exercises) || obj.exercises.length === 0) return false;
  for (const ex of obj.exercises as unknown[]) {
    if (typeof ex !== 'object' || ex === null) return false;
    const e = ex as Record<string, unknown>;
    if (typeof e.name !== 'string') return false;
    if (e.type !== 'reps' && e.type !== 'timer') return false;
    if (typeof e.sets !== 'number' || e.sets < 1) return false;
    if (e.type === 'reps' && typeof e.reps !== 'number') return false;
    if (e.type === 'timer' && typeof e.duration !== 'number') return false;
  }
  return true;
}
