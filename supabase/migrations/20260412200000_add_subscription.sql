-- Monetization: subscription status on profiles
-- Values: 'free' | 'premium'
-- Updated by RevenueCat webhook or client SDK verification

alter table public.profiles
  add column if not exists subscription_status text not null default 'free'
    check (subscription_status in ('free', 'premium')),
  add column if not exists subscription_expires_at timestamptz default null,
  add column if not exists revenue_cat_id text default null;

-- Streak freeze usage tracking for free users (1 freeze stored max)
-- is_paused already exists; we just track freeze_tokens count
alter table public.profiles
  add column if not exists freeze_tokens integer not null default 1;

-- Duel cooldown tracking: last duel timestamp per user
alter table public.profiles
  add column if not exists last_duel_at timestamptz default null;

comment on column public.profiles.subscription_status is 'free = ads + limited features, premium = no ads + full features';
comment on column public.profiles.freeze_tokens is 'Available streak freeze tokens. Free: max 1. Premium: max 3.';
comment on column public.profiles.last_duel_at is 'Timestamp of last duel started, used to enforce duel cooldown for free users.';
