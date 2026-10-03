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
- **Co-op challenges** with real-time team progress (1v1 Gold-wager challenges retired, ADR 025)
- **Achievements** system
- Friends, friend requests, inbox notifications
- Leaderboards (friends first, global on demand) and kudos between friends
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
- [x] Habit science, explained in the app (“How HabitQuest helps you”): “When? After…” anchors and personal reasons, mini versions that keep the streak, identity titles at 7, 21 and 66 days, no-penalty comeback and streak repair
- [x] Seasonal arcs (Winter, Spring, Summer, Autumn) with runes, seasonal capes and the Crown of Seasons (ADR 024)
- [x] Lighter app: one Pause screen (ADR 029), a progressive Today for new players, a two-tab Social screen, at most 2 reminders a day (ADR 026), a mission chest (ADR 028)

## 🔜 Phase 7 — Post-launch expansion
- [x] Multi-language support: English, French and Japanese (app, site, e-mails, store listings)
- [x] Push notifications (habit reminders, duel invites), within a daily budget
- [x] Full web version (habitquest.expo.app, shared `src/` logic)
- [x] Additional PvP modes: arenas (6 leagues, 10-day seasons, daily fights, ADR 012) and co-op challenges (ADR 013)
- [ ] Guilds (groups of 5 with a weekly goal), as an evolution of co-op
- [ ] Pip as an AI coach (Premium), once costs and privacy are studied

---

## Design principles
- Daily habits are validated by the user; skill decays after inactivity to keep the loop honest.
- Cosmetic-only purchases; no pay-to-win mechanics.
- Real-time features (duels, notifications) leverage Supabase Realtime.
- iOS-first (Expo iOS build priority), Android to follow.
