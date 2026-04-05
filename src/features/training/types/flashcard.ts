// ─────────────────────────────────────────────────────────────────────────────
// HabitQuest Flashcard Deck JSON format v1
//
// Example:
// {
//   "version": 1,
//   "title": "Spanish B1 Vocab",
//   "category": "learning",
//   "description": "Most common 500 words",
//   "cards": [
//     { "front": "el agua",    "back": "water",  "hint": "feminine despite 'el'" },
//     { "front": "correr",     "back": "to run"  },
//     { "front": "¿Cómo estás?", "back": "How are you?" }
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────

export interface Flashcard {
  id?: string;
  front: string;
  back: string;
  hint?: string;
}

export interface FlashcardDeckFile {
  version: 1;
  title: string;
  category: string;
  description?: string;
  cards: Flashcard[];
}

// SRS state per card (stored locally alongside the deck)
export interface CardSrsState {
  cardIndex: number;
  interval: number;       // days until next review
  ease: number;           // ease factor (starts at 2.5)
  dueDate: string;        // ISO date
  reviewCount: number;
}

export interface StoredDeck {
  id: string;
  importedAt: string;
  totalReviews: number;
  lastStudiedAt: string | null;
  srsStates: CardSrsState[];
  data: FlashcardDeckFile;
}

// ─── Validation ───────────────────────────────────────────────────────────────
export function isValidDeckFile(json: unknown): json is FlashcardDeckFile {
  if (typeof json !== 'object' || json === null) return false;
  const obj = json as Record<string, unknown>;
  if (obj.version !== 1) return false;
  if (typeof obj.title !== 'string' || !obj.title.trim()) return false;
  if (!Array.isArray(obj.cards) || obj.cards.length === 0) return false;
  for (const card of obj.cards as unknown[]) {
    if (typeof card !== 'object' || card === null) return false;
    const c = card as Record<string, unknown>;
    if (typeof c.front !== 'string' || !c.front.trim()) return false;
    if (typeof c.back !== 'string' || !c.back.trim()) return false;
  }
  return true;
}

// ─── SM-2 algorithm (simplified) ─────────────────────────────────────────────
// quality: 0=blackout, 1=hard, 2=ok, 3=easy
export function computeNextReview(
  state: CardSrsState,
  quality: 0 | 1 | 2 | 3,
): CardSrsState {
  const q = quality;
  let { interval, ease } = state;

  // Update ease factor
  ease = Math.max(1.3, ease + 0.1 - (3 - q) * (0.08 + (3 - q) * 0.02));

  // Update interval
  if (q < 2) {
    interval = 1; // reset
  } else if (state.reviewCount === 0) {
    interval = 1;
  } else if (state.reviewCount === 1) {
    interval = 3;
  } else {
    interval = Math.round(interval * ease);
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);

  return {
    ...state,
    interval,
    ease,
    dueDate: dueDate.toISOString().slice(0, 10),
    reviewCount: state.reviewCount + 1,
  };
}

export function makeInitialSrsState(cardIndex: number): CardSrsState {
  return {
    cardIndex,
    interval: 1,
    ease: 2.5,
    dueDate: new Date().toISOString().slice(0, 10),
    reviewCount: 0,
  };
}

export function getDueCards(deck: StoredDeck): number[] {
  const today = new Date().toISOString().slice(0, 10);
  return deck.srsStates
    .filter((s) => s.dueDate <= today)
    .map((s) => s.cardIndex);
}
