# GymBuddy

An offline-first workout logger and fitness companion for gym beginners and university students.
Log sets in seconds with a rest timer, keep working without a connection, and watch your progress
through PRs, estimated 1RM, streaks and body stats.

> Course project for **CSE-464 Mobile App Development**.

## Problem

Gym-goers log workouts in notes apps or not at all. Existing fitness apps tend to be complex,
paywalled, or unusable offline — a real problem in basement gyms with poor signal.

## Features

| Screen | What it does |
|---|---|
| Onboarding | Introduces the app; sets goal, units and experience level |
| Login / Register / Forgot Password | Email + password and Google sign-in, password reset |
| Home | Today's plan, current streak, quick-start workout, recent sessions |
| Exercise Library & Detail | Searchable, filterable exercises with instructions and personal history |
| Routine Builder | Create and reorder routines with target sets, reps and rest |
| Active Workout | Log sets / reps / weight, rest timer with notification, works offline |
| Progress | Volume and 1RM charts, personal records, streaks |
| Body Stats | Body-weight log with chart and private progress photos |
| Profile / Settings | Light/dark/system theme, kg/lb, workout reminders, account |

Every screen has loading, error and empty states, supports light and dark mode, and adapts to phones and tablets.

## Architecture

```
React Native (Expo) app ──► Supabase Auth / Postgres (RLS) / Storage
        │   ▲
        │   └── AsyncStorage offline queue → syncs automatically on reconnect
        └──► Vercel serverless /api (AI planner proxy) ──► Gemini API
```

| Layer | Technology |
|---|---|
| App | React Native + Expo, JavaScript ES6+, React Navigation, Zustand |
| Backend | Supabase Auth, Postgres with Row Level Security, Storage |
| Offline | AsyncStorage cache and write queue, NetInfo |
| Device | expo-notifications, expo-image-picker, expo-secure-store |
| Charts | react-native-gifted-charts |
| API | Vercel serverless function (keeps the Gemini key off the device) |
| Tests / CI | Jest, React Native Testing Library, GitHub Actions |
| Release | Signed Android APK via Expo EAS Build; web demo on Vercel |

No secret keys ship in the app. Only the Supabase URL and publishable key are bundled; all data access
is enforced by Row Level Security.

## Getting started

```bash
git clone https://github.com/NazifaNeloy/GymBuddy.git
cd GymBuddy
cp .env.example .env      # fill in your Supabase URL and publishable key
npm install
npx expo start
```

Google sign-in requires a development build (`eas build --profile development`).

## Scripts

| Command | Purpose |
|---|---|
| `npx expo start` | Start the dev server |
| `npm test` | Run Jest + React Native Testing Library |
| `npx expo export -p web` | Build the web demo for Vercel |
| `eas build -p android --profile production` | Build the signed release APK |

## Branching

- `main` — released, graded builds only
- `develop` — integration branch
- `feat/*`, `fix/*`, `chore/*`, `test/*`, `docs/*` — branch from `develop`, merge back via PR

Commits follow [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat(workout): add rest timer`.

## Project structure

See [CLAUDE.md](./CLAUDE.md) for the full folder layout and engineering rules.

## License

MIT
