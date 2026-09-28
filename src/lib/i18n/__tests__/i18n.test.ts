const mockGetLocales = jest.fn();
const mockStore = new Map<string, string>();

jest.mock('expo-localization', () => ({ getLocales: () => mockGetLocales() }));

jest.mock('../../storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStore.get(key),
    set: (key: string, value: string) => mockStore.set(key, value),
    delete: (key: string) => mockStore.delete(key),
  },
}));

function loadI18n() {
  let mod: typeof import('..') | undefined;
  jest.isolateModules(() => {
    mod = require('..');
  });
  return mod!;
}

describe('i18n', () => {
  beforeEach(() => {
    mockStore.clear();
    mockGetLocales.mockReset();
  });

  it('uses French on a French device at first launch', () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'fr' }]);
    expect(loadI18n().lang$.get()).toBe('fr');
  });

  it('falls back to English on any other device language', () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'de' }]);
    expect(loadI18n().lang$.get()).toBe('en');
  });

  it('falls back to English when locales are unavailable', () => {
    mockGetLocales.mockImplementation(() => {
      throw new Error('no native module');
    });
    expect(loadI18n().lang$.get()).toBe('en');
  });

  it('keeps the language chosen in settings over the device language', () => {
    mockStore.set('app_language', 'fr');
    mockGetLocales.mockReturnValue([{ languageCode: 'en' }]);
    const { lang$, setLang } = loadI18n();
    expect(lang$.get()).toBe('fr');

    setLang('en');
    expect(mockStore.get('app_language')).toBe('en');
  });
});
