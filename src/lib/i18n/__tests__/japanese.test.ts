/**
 * Japanese (L1): every text exists, keeps its {placeholders}, and the app
 * picks Japanese on a Japanese device.
 */
jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageCode: 'ja' }]) }));

import { getLocales } from 'expo-localization';
import { STRINGS_FOR_TESTS, detectDeviceLang, localeTag, LANGS } from '../index';
import { questText, shopItemText, achievementText } from '../content';

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe('Japanese texts', () => {
  const { en, ja } = STRINGS_FOR_TESTS;

  it('has every key of the English dictionary, none empty', () => {
    expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
    for (const [key, value] of Object.entries(ja)) {
      expect([key, value.trim().length > 0]).toEqual([key, true]);
    }
  });

  it('keeps the same {placeholders} as English', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect([key, placeholders(ja[key])]).toEqual([key, placeholders(en[key])]);
    }
  });

  it('is actually Japanese, not copied English', () => {
    expect(ja.tab_quests).toBe('クエスト');
    const untranslated = (Object.keys(en) as (keyof typeof en)[]).filter(
      (k) => ja[k] === en[k] && /[a-z]{4,}/i.test(en[k].replace(/\{\w+\}/g, '')),
    );
    // Brand names, units and the arc names (the English trend names, ADR 024).
    expect(untranslated.filter((k) => !/HabitQuest|hero@quest|English|Français/.test(en[k]) && !k.startsWith('arc_name_'))).toEqual([]);
  });
});

describe('language detection', () => {
  it('picks Japanese on a Japanese device, English on an unknown one', () => {
    expect(detectDeviceLang()).toBe('ja');
    (getLocales as jest.Mock).mockReturnValueOnce([{ languageCode: 'de' }]);
    expect(detectDeviceLang()).toBe('en');
  });

  it('offers Japanese among the languages and formats dates the Japanese way', () => {
    expect(LANGS).toContain('ja');
    expect(localeTag('ja')).toBe('ja-JP');
  });
});

describe('game content in Japanese', () => {
  it('translates quests, achievements and shop items, falls back to English', () => {
    expect(questText('ja', { title: 'First Step', description: 'x' }).title).toBe('最初の一歩');
    expect(achievementText('ja', { key: 'streak_7', name: 'Week Warrior', description: 'x' }).title).toBe('1週間の戦士');
    expect(shopItemText('ja', { name: 'Wooden Shield' }).title).toBe('木の盾');
    expect(shopItemText('ja', { name: 'Brand New Item', description: 'New' }).title).toBe('Brand New Item');
  });
});
