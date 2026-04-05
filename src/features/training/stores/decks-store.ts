import { observable } from '@legendapp/state';
import { storage } from '../../../lib/storage/mmkv';
import {
  isValidDeckFile,
  makeInitialSrsState,
  computeNextReview,
  getDueCards,
} from '../types/flashcard';
import type { FlashcardDeckFile, StoredDeck, CardSrsState } from '../types/flashcard';

const DECKS_KEY = 'flashcard-decks';

interface DecksState {
  decks: StoredDeck[];
  isLoading: boolean;
}

export const decksStore$ = observable<DecksState>({
  decks: [],
  isLoading: false,
});

function loadFromStorage(): StoredDeck[] {
  const raw = storage.getString(DECKS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function save(decks: StoredDeck[]): void {
  storage.set(DECKS_KEY, JSON.stringify(decks));
}

export function loadDecks() {
  const decks = loadFromStorage();
  decksStore$.decks.set(decks);
}

export function importDeck(json: unknown): StoredDeck {
  if (!isValidDeckFile(json)) {
    throw new Error('Invalid deck format. Check the JSON structure.');
  }
  const data = json as FlashcardDeckFile;

  const deck: StoredDeck = {
    id: `deck_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    importedAt: new Date().toISOString(),
    totalReviews: 0,
    lastStudiedAt: null,
    srsStates: data.cards.map((_, i) => makeInitialSrsState(i)),
    data,
  };

  const existing = loadFromStorage();
  const updated = [...existing, deck];
  save(updated);
  decksStore$.decks.set(updated);
  return deck;
}

export function recordReview(
  deckId: string,
  cardIndex: number,
  quality: 0 | 1 | 2 | 3,
): void {
  const decks = loadFromStorage().map((d) => {
    if (d.id !== deckId) return d;
    const srsStates: CardSrsState[] = d.srsStates.map((s) =>
      s.cardIndex === cardIndex ? computeNextReview(s, quality) : s,
    );
    return {
      ...d,
      srsStates,
      totalReviews: d.totalReviews + 1,
      lastStudiedAt: new Date().toISOString(),
    };
  });
  save(decks);
  decksStore$.decks.set(decks);
}

export function deleteDeck(deckId: string): void {
  const decks = loadFromStorage().filter((d) => d.id !== deckId);
  save(decks);
  decksStore$.decks.set(decks);
}

export { getDueCards };
