import { observable } from '@legendapp/state';

function loadRegistry() {
  let mod: typeof import('../user-data') | undefined;
  jest.isolateModules(() => {
    mod = require('../user-data');
  });
  return mod!;
}

describe('user-data registry', () => {
  it('resets registered stores to a fresh initial state', async () => {
    const { resetOnSignOut, clearUserData } = loadRegistry();
    const initialState = () => ({ habits: [] as string[], gold: 0 });
    const store$ = observable(initialState());
    resetOnSignOut(store$, initialState);

    store$.habits.set(['read']);
    store$.gold.set(42);
    await clearUserData();

    expect(store$.get()).toEqual({ habits: [], gold: 0 });
  });

  it('runs every cleanup even when one fails', async () => {
    const { onUserDataCleared, clearUserData } = loadRegistry();
    const second = jest.fn();
    onUserDataCleared(() => {
      throw new Error('boom');
    });
    onUserDataCleared(async () => {
      throw new Error('async boom');
    });
    onUserDataCleared(second);

    await expect(clearUserData()).resolves.toBeUndefined();
    expect(second).toHaveBeenCalled();
  });
});
