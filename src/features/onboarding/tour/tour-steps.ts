import type { Strings } from '../../../lib/i18n';
import type { TourTargetKey } from './tour-targets';

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
}

export const TOUR_STEPS: TourStep[] = [
  { target: 'hero', title: 'tuto_hero_title', body: 'tuto_hero_body', advance: 'next' },
  { target: 'first-check', title: 'tuto_complete_title', body: 'tuto_complete_body', advance: 'completion' },
  { target: 'missions', title: 'tuto_daily_title', body: 'tuto_daily_body', advance: 'missions' },
  { target: 'add', title: 'tuto_add_title', body: 'tuto_add_body', advance: 'next' },
  { title: 'tuto_focus_title', body: 'tuto_focus_body', advance: 'next' },
  { title: 'tuto_notif_title', body: 'tuto_notif_body', advance: 'reminder' },
];

export const REMINDER_HOURS = [8, 12, 18, 20, 21];
export const DEFAULT_REMINDER_HOUR = 20;
