-- Migration: habit_content
-- Adds a JSONB content column to habits for attaching
-- timers, checklists, or external links to a habit.

alter table public.habits
  add column if not exists content jsonb default null;

comment on column public.habits.content is
  'Optional structured content attached to a habit.
   Supported shapes:
     { "type": "timer",     "duration": 180, "label": "Plank" }
     { "type": "checklist", "items": [{ "id": "1", "label": "Push-ups x20" }] }
     { "type": "link",      "url": "https://...", "label": "Watch tutorial" }
  ';
