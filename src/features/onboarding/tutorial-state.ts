import { observable } from '@legendapp/state';
import { storage } from '../../lib/storage/mmkv';

const TUTORIAL_KEY = 'today-tutorial-seen';

/** Whether the first-run tips on the Today screen have been seen or dismissed. */
export const tutorialSeen$ = observable<boolean>(storage.getString(TUTORIAL_KEY) === 'true');

tutorialSeen$.onChange(({ value }) => storage.set(TUTORIAL_KEY, value ? 'true' : 'false'));

export function markTutorialSeen(): void {
  tutorialSeen$.set(true);
}

/** Replays the tips next time the Today screen is shown (from Settings). */
export function resetTutorial(): void {
  tutorialSeen$.set(false);
}
