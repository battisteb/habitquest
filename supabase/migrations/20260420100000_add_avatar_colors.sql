alter table public.profiles
  add column if not exists skin_color text not null default '#f4c98a',
  add column if not exists hair_color text not null default '#4a3728',
  add column if not exists eye_color text not null default '#1a1a2e';
