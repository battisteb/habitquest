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
- Animations (Reanimated), pixel art design system and 32×32 hero

## 🚧 Phase 6 — Release preparation (in progress)
- [x] LICENSE
- [ ] Public README screenshots and demo GIF
- [x] Onboarding and tutorial
- [ ] iOS TestFlight build
- [ ] App Store submission (iOS priority)
- [ ] Android release build

## 🔜 Phase 7 — Post-launch expansion
- [ ] Multi-language support (start with English + French)
- [ ] Push notifications (habit reminders, duel invites)
- [ ] Web companion (shared `src/` logic)
- [x] Additional PvP modes: arenas (6 leagues, 10-day seasons, daily fights, ADR 012) and co-op challenges (ADR 013). Guilds dropped

---

## Design principles
- Daily habits are validated by the user; skill decays after inactivity to keep the loop honest.
- Cosmetic-only purchases; no pay-to-win mechanics.
- Real-time features (duels, notifications) leverage Supabase Realtime.
- iOS-first (Expo iOS build priority), Android to follow.
