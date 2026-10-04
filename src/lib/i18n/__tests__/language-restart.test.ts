/**
 * The Japanese pixel font is chosen at startup: switching to or from
 * Japanese restarts the app, switching between English and French does not.
 */
const mockRestart = jest.fn();
jest.mock('../../restart-app', () => ({ restartApp: () => mockRestart() }));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { setLang, STARTED_IN_JAPANESE, lang$ } from '../index';

describe('setLang', () => {
  beforeEach(() => mockRestart.mockClear());

  it('started in English here', () => {
    expect(STARTED_IN_JAPANESE).toBe(false);
  });

  it('switches between English and French without restarting', () => {
    setLang('fr');
    setLang('en');
    expect(lang$.get()).toBe('en');
    expect(mockRestart).not.toHaveBeenCalled();
  });

  it('restarts the app to switch to Japanese (new pixel font)', () => {
    setLang('ja');
    expect(lang$.get()).toBe('ja');
    expect(mockRestart).toHaveBeenCalledTimes(1);
  });
});
