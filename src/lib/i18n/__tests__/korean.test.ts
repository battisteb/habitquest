/**
 * Korean: every text exists, keeps its {placeholders}, and the app picks
 * Korean on a Korean device.
 */
jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageCode: 'ko' }]) }));

import { getLocales } from 'expo-localization';
import { STRINGS_FOR_TESTS, detectDeviceLang, localeTag, LANGS, fontScript } from '../index';
import { questText, shopItemText, achievementText } from '../content';
import { HABIT_TEMPLATES, templateName } from '../../constants/habit-templates';

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe('Korean texts', () => {
  const { en, ko } = STRINGS_FOR_TESTS;

  it('has every key of the English dictionary, none empty', () => {
    expect(Object.keys(ko).sort()).toEqual(Object.keys(en).sort());
    for (const [key, value] of Object.entries(ko)) {
      expect([key, value.trim().length > 0]).toEqual([key, true]);
    }
  });

  it('keeps the same {placeholders} as English', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect([key, placeholders(ko[key])]).toEqual([key, placeholders(en[key])]);
    }
  });

  it('is actually Korean, not copied English', () => {
    expect(ko.tab_quests).toBe('퀘스트');
    const untranslated = (Object.keys(en) as (keyof typeof en)[]).filter(
      (k) => ko[k] === en[k] && /[a-z]{4,}/i.test(en[k].replace(/\{\w+\}/g, '')),
    );
    // Brand names, units and the arc names (the English trend names, ADR 024).
    expect(untranslated.filter((k) => !/HabitQuest|hero@quest|English|Français/.test(en[k]) && !k.startsWith('arc_name_'))).toEqual([]);
  });
});

describe('language detection', () => {
  it('picks Korean on a Korean device, English on an unknown one', () => {
    expect(detectDeviceLang()).toBe('ko');
    (getLocales as jest.Mock).mockReturnValueOnce([{ languageCode: 'de' }]);
    expect(detectDeviceLang()).toBe('en');
  });

  it('offers the five languages, formats dates the Korean way and has its own pixel font', () => {
    expect(LANGS).toEqual(['en', 'fr', 'ja', 'ko', 'zh']);
    expect(localeTag('ko')).toBe('ko-KR');
    expect(fontScript('ko')).toBe('ko');
    expect(fontScript('fr')).toBe('latin');
  });
});

describe('game content in Korean', () => {
  it('translates quests, achievements and shop items, falls back to English', () => {
    expect(questText('ko', { title: 'First Step', description: 'x' }).title).toBe('첫걸음');
    expect(achievementText('ko', { key: 'streak_7', name: 'Week Warrior', description: 'x' }).title).toBe('일주일의 전사');
    expect(shopItemText('ko', { name: 'Wooden Shield' }).title).toBe('나무 방패');
    expect(shopItemText('ko', { name: 'Brand New Item', description: 'New' }).title).toBe('Brand New Item');
  });

  it('names every quest template in Korean and Japanese', () => {
    for (const t of HABIT_TEMPLATES) {
      expect([t.id, /[가-힣]/.test(templateName(t, 'ko'))]).toEqual([t.id, true]);
      expect([t.id, /[ぁ-んァ-ン一-龯]/.test(templateName(t, 'ja'))]).toEqual([t.id, true]);
    }
    expect(templateName(HABIT_TEMPLATES[0], 'fr')).toBe(HABIT_TEMPLATES[0].name_fr);
  });
});

