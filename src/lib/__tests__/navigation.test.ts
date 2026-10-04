/**
 * Back always works: on the web, a page opened directly has no history and
 * router.back() left the player stuck (Battiste on /habit/create, /settings).
 */
import { goBack } from '../navigation';

const router = (canGoBack: boolean) => ({ canGoBack: () => canGoBack, back: jest.fn(), replace: jest.fn() });

describe('goBack', () => {
  it('goes back when there is a previous page', () => {
    const r = router(true);
    goBack(r, '/(tabs)/profile');
    expect(r.back).toHaveBeenCalled();
    expect(r.replace).not.toHaveBeenCalled();
  });

  it('opens a sensible screen when the page was opened directly', () => {
    const r = router(false);
    goBack(r, '/(tabs)/profile');
    expect(r.back).not.toHaveBeenCalled();
    expect(r.replace).toHaveBeenCalledWith('/(tabs)/profile');
  });

  it('falls back to the Quests screen by default', () => {
    const r = router(false);
    goBack(r);
    expect(r.replace).toHaveBeenCalledWith('/(tabs)/today');
  });
});
