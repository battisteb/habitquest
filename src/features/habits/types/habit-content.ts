export interface ChecklistItem {
  id: string;
  label: string;
}

export type HabitContent =
  | { type: 'timer'; duration: number; label: string }
  | { type: 'checklist'; items: ChecklistItem[] }
  | { type: 'link'; url: string; label: string };

export type HabitContentType = HabitContent['type'];

export const CONTENT_TYPE_CONFIG: Record<
  HabitContentType,
  { icon: string; label: string; description: string }
> = {
  timer: {
    icon: '⏱️',
    label: 'Timer',
    description: 'A countdown for timed exercises or sessions',
  },
  checklist: {
    icon: '✅',
    label: 'Checklist',
    description: 'A list of steps to complete one by one',
  },
  link: {
    icon: '🔗',
    label: 'Link',
    description: 'An external resource (video, article, PDF…)',
  },
};
