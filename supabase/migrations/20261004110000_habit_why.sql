-- G2: why a quest matters and when it happens ("after my morning coffee").
-- Both optional, written by the player; Pip quotes them in reminders and on
-- hard days. Implementation intentions ("after X, I do Y") roughly double the
-- odds of following through (Gollwitzer & Sheeran, 2006).

alter table public.habits
  add column if not exists why text,
  add column if not exists anchor text;

alter table public.habits
  drop constraint if exists habits_why_length,
  add constraint habits_why_length check (why is null or char_length(why) <= 140),
  drop constraint if exists habits_anchor_length,
  add constraint habits_anchor_length check (anchor is null or char_length(anchor) <= 80);
