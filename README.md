# HabitQuest

Gamified habit tracker with pixel art aesthetics. Turn discipline into an adventure.

## Stack

- **React Native** (Expo SDK 55) — iOS priority
- **Supabase** — Auth, PostgreSQL database, Edge Functions
- **Legend-State** — State management with offline-first sync
- **React Native Skia** — Pixel art rendering
- **Reanimated 3** — 60fps animations
- **TypeScript** — Strict mode

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npx expo start
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

## Project Structure

```
app/              # Expo Router routes (thin screens)
src/
  features/       # Feature modules (auth, habits, gamification...)
  ui/             # Pixel art design system
  lib/            # Shared infrastructure (Supabase, MMKV, constants)
  types/          # Shared TypeScript types
assets/           # Fonts, sprites, images, sounds
supabase/         # Migrations and Edge Functions
docs/adr/         # Architecture Decision Records
e2e/              # Maestro E2E tests
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm test` | Run Jest tests |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run typecheck` | TypeScript type check |

## Development

This project uses [Claude Code](https://claude.ai/code) as the primary development tool. See `CLAUDE.md` for project conventions and agent configuration.

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code refactoring
- `test:` adding/updating tests
- `chore:` maintenance tasks
