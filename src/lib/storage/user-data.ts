type Cleanup = () => void | Promise<void>;

const cleanups: Cleanup[] = [];

/**
 * Registers work to run when the signed-in user's local data must be wiped
 * (sign-out or account deletion). Device preferences are not user data.
 */
export function onUserDataCleared(cleanup: Cleanup): void {
  cleanups.push(cleanup);
}

/** Resets a (persisted) store to its initial state when user data is cleared. */
export function resetOnSignOut<T>(store$: { set(value: T): void }, initialState: () => T): void {
  onUserDataCleared(() => {
    store$.set(initialState());
  });
}

/** Runs every registered cleanup; one failing never blocks the others. */
export async function clearUserData(): Promise<void> {
  await Promise.all(
    cleanups.map(async (cleanup) => {
      try {
        await cleanup();
      } catch {
        // Best effort: leftover cache is overwritten on next sign-in.
      }
    }),
  );
}
