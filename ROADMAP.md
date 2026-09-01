# Roadmap

> High-level plan for HabitQuest. Ordered by phase, then priority.

## ✅ Phase 0 — Setup & Infrastructure
- Expo SDK 55 + TypeScript scaffolding
- Development environment, linting, formatting, typechecking
- Supabase project (Postgres + Auth + Realtime)
- Testing: Jest + Detox (e2e)

## ✅ Phase 1 — Backend & Auth
- Supabase authentication and RLS policies
- Database schema and migrations
- Sync layer with Legend-State

## ✅ Phase 2 — Core Loop
- Daily and weekly habit tracking
- Categories per habit
- Custom emoji per habit
- Habit completion → XP and Gold rewards
- Streak system with `best_streak` denormalization

## ✅ Phase 3 — Gamification
- Character progression (XP, levels)
- Cumulative daily XP display in header
- Per-habit monthly heatmap on detail screen
- Statistics screen with per-category breakdown, history
- Habit sort mode preferences
- CTA button for empty states, pull-to-refresh

## ✅ Phase 4 — Social & Competitive
- **Duels** — real-time PvP with HP bars and battle music
- **Challenges** with real-time progress tracking and Gold rewards
- **Achievements** system
- Friends, friend requests, inbox notifications
- Leaderboards (streaks, XP)
- Duel win/loss counts on public profile

## ✅ Phase 5 — Polish
- Sound effects (CC0 SFX) and duel battle music
- Animations (Reanimated 3), pixel art rendering (React Native Skia)

## 🚧 Phase 6 — Release preparation (in progress)
- [ ] LICENSE
- [ ] Public README screenshots and demo GIF
- [ ] Onboarding and tutorial
- [ ] iOS TestFlight build
- [ ] App Store submission (iOS priority)
- [ ] Android release build

## 🔜 Phase 7 — Post-launch expansion
- [ ] Multi-language support (start with English + French)
- [ ] Push notifications (habit reminders, duel invites)
- [ ] Web companion (shared `src/` logic)
- [ ] Additional PvP modes (co-op challenges, guilds)

---

## Design principles
- Daily habits are validated by the user; skill decays after inactivity to keep the loop honest.
- Cosmetic-only purchases; no pay-to-win mechanics.
- Real-time features (duels, notifications) leverage Supabase Realtime.
- iOS-first (Expo iOS build priority), Android to follow.
