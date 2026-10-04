/**
 * The Japanese and Korean pixel fonts are chosen at startup: switching to or
 * from Japanese or Korean restarts the app, switching between English and
 * French does not.
 */
const mockRestart = jest.fn();
jest.mock('../../restart-app', () => ({ restartApp: () => mockRestart() }));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { setLang, STARTUP_FONT_SCRIPT, lang$ } from '../index';

describe('setLang', () => {
  beforeEach(() => mockRestart.mockClear());

  it('started in English here', () => {
    expect(STARTUP_FONT_SCRIPT).toBe('latin');
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

  it('restarts the app to switch to Korean (its own pixel font)', () => {
    setLang('ko');
    expect(lang$.get()).toBe('ko');
    expect(mockRestart).toHaveBeenCalledTimes(1);
  });
});
