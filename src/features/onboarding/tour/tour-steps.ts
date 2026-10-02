import type { Strings } from '../../../lib/i18n';
import type { TourTargetKey } from './tour-targets';
import type { PipExpression, PipMood } from '../../mascot/sprites';

export interface TourStep {
  /** Element pointed at; none = centered card. */
  target?: TourTargetKey;
  title: keyof Strings;
  body: keyof Strings;
  /**
   * next: "Next" button · completion: the player validates a quest ·
   * missions: the player opens the missions banner · reminder: last question.
   */
  advance: 'next' | 'completion' | 'missions' | 'reminder';
  /** How Pip, the guide, looks on this step. */
  pip: { expression: PipExpression; mood: PipMood };
}

export const TOUR_STEPS: TourStep[] = [
  { title: 'tuto_pip_title', body: 'tuto_pip_body', advance: 'next', pip: { expression: 'joy', mood: 'calm' } },
  { target: 'hero', title: 'tuto_hero_title', body: 'tuto_hero_body', advance: 'next', pip: { expression: 'happy', mood: 'calm' } },
  { target: 'first-check', title: 'tuto_complete_title', body: 'tuto_complete_body', advance: 'completion', pip: { expression: 'happy', mood: 'calm' } },
  { target: 'missions', title: 'tuto_daily_title', body: 'tuto_daily_body', advance: 'missions', pip: { expression: 'joy', mood: 'party' } },
  { target: 'add', title: 'tuto_add_title', body: 'tuto_add_body', advance: 'next', pip: { expression: 'proud', mood: 'fire' } },
  { title: 'tuto_focus_title', body: 'tuto_focus_body', advance: 'next', pip: { expression: 'sleepy', mood: 'rest' } },
  { title: 'tuto_notif_title', body: 'tuto_notif_body', advance: 'reminder', pip: { expression: 'happy', mood: 'love' } },
];

export const REMINDER_HOURS = [8, 12, 18, 20, 21];
export const DEFAULT_REMINDER_HOUR = 20;
