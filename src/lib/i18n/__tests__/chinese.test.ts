/**
 * Traditional Chinese — Taiwan (zh-Hant): every text exists, keeps its
 * {placeholders}, and the app picks Chinese on a Chinese device.
 */
jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageCode: 'zh' }]) }));

import { getLocales } from 'expo-localization';
import { STRINGS_FOR_TESTS, detectDeviceLang, localeTag, LANGS } from '../index';
import { questText, shopItemText, achievementText } from '../content';

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe('Traditional Chinese texts', () => {
  const { en, zh } = STRINGS_FOR_TESTS;

  it('has every key of the English dictionary, none empty', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
    for (const [key, value] of Object.entries(zh)) {
      expect([key, value.trim().length > 0]).toEqual([key, true]);
    }
  });

  it('keeps the same {placeholders} as English', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect([key, placeholders(zh[key])]).toEqual([key, placeholders(en[key])]);
    }
  });

  it('is actually Chinese, not copied English', () => {
    expect(zh.tab_quests).toBe('任務');
    const untranslated = (Object.keys(en) as (keyof typeof en)[]).filter(
      (k) => zh[k] === en[k] && /[a-z]{4,}/i.test(en[k].replace(/\{\w+\}/g, '')),
    );
    // Brand names, units and the arc names (the English trend names, ADR 024).
    expect(untranslated.filter((k) => !/HabitQuest|hero@quest|English|Français/.test(en[k]) && !k.startsWith('arc_name_'))).toEqual([]);
  });
});

describe('language detection', () => {
  it('picks Chinese on a Chinese device, English on an unknown one', () => {
    expect(detectDeviceLang()).toBe('zh');
    (getLocales as jest.Mock).mockReturnValueOnce([{ languageCode: 'de' }]);
    expect(detectDeviceLang()).toBe('en');
  });

  it('offers Chinese among the languages and formats dates the Taiwan way', () => {
    expect(LANGS).toContain('zh');
    expect(localeTag('zh')).toBe('zh-TW');
  });
});

describe('game content in Chinese', () => {
  it('translates quests, achievements and shop items, falls back to English', () => {
    expect(questText('zh', { title: 'First Step', description: 'x' }).title).toBe('第一步');
    expect(achievementText('zh', { key: 'streak_7', name: 'Week Warrior', description: 'x' }).title).toBe('一週戰士');
    expect(shopItemText('zh', { name: 'Wooden Shield' }).title).toBe('木盾');
    expect(shopItemText('zh', { name: 'Brand New Item', description: 'New' }).title).toBe('Brand New Item');
  });
});
