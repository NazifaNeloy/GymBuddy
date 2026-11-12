# CLAUDE.md — GymBuddy

Workout logger and fitness companion for gym beginners and university students.
Course project for **CSE-464 Mobile App Development**. Solo developer.

## Working agreement

- Build **one step at a time**. After each step, stop and wait for the user to say **"continue"**.
- Each step should be small enough to review, test and commit on its own.
- Do not add libraries outside the stack below without asking first and saying why.
- Free tiers only (Supabase Free, Vercel Hobby, Expo EAS Free, Gemini free tier, GitHub Free).

## Stack

| Concern | Choice |
|---|---|
| Framework | React Native + Expo, latest stable SDK (SDK 58 / RN 0.88 as of Nov 2026) |
| Language | JavaScript ES6+ (no TypeScript) |
| State | Zustand (one store per domain, persisted where needed) |
| Navigation | React Navigation v7 (native stack + bottom tabs). Not Expo Router. |
| Auth | Supabase Auth: email/password, password reset, Google OAuth |
| Database | Supabase Postgres with Row Level Security on every table |
| File storage | Supabase Storage (private bucket for progress photos) |
| Offline | AsyncStorage cache + write queue; sync on reconnect |
| Secure storage | expo-secure-store (encryption key for the persisted auth session) |
| Device features | expo-notifications, expo-image-picker |
| Charts | react-native-gifted-charts |
| Tests | Jest + React Native Testing Library; GitHub Actions runs them on every push/PR |
| AI proxy | Vercel serverless function (`/api`) calling Gemini; key never in the app |
| Hosting | Vercel: Expo web export (live demo) + `/api` functions |
| Release | Signed Android release APK via Expo EAS Build (graded deliverable) |

Small helper packages that the stack needs (ask before adding anything else):
`@supabase/supabase-js`, `@react-native-community/netinfo` (online/offline detection),
`expo-auth-session` + `expo-web-browser` (Google OAuth), `expo-crypto` (client UUIDs),
`react-native-safe-area-context`, `react-native-screens`, `expo-dev-client`.

## Non-negotiable rules

1. **Every screen has loading, error and empty states.** Use the shared
   `LoadingState`, `ErrorState` (with retry) and `EmptyState` (with a call to action) components.
2. **Responsive for phone and tablet.** Use `useWindowDimensions` via the `useResponsive` hook;
   no hard-coded screen widths. Tablet = shortest side ≥ 600 dp; lists switch to 2 columns at ≥ 768 dp width
   and 3 at ≥ 1100 dp. Forms are capped at `layout.formMaxWidth` and centered.
3. **Light and dark mode.** All colors come from the theme. No hex values inside screens/components.
   User can choose System / Light / Dark in Settings.
4. **Offline-first logging.** Workouts, sets, routines and body-weight entries are written locally
   first, queued, and synced automatically when the device is back online. The UI never waits on the network to log a set.
5. **No secret keys in the app.** Only the Supabase URL and publishable (anon) key ship in the client,
   via `EXPO_PUBLIC_*` env vars; they are safe only because RLS is enabled. The Gemini key and the Supabase
   service-role key live only in Vercel environment variables. `.env` is git-ignored; `.env.example` is committed.
6. **Clean folder structure** (see below). Screens stay thin: data logic lives in stores and services.
7. **Small commits on feature branches.** Never commit straight to `main`.

## Data and sync conventions

- Primary keys are UUIDs generated on the device (`expo-crypto`), so offline rows never need re-keying.
- Every synced table has `user_id`, `created_at`, `updated_at`, `deleted_at` (soft delete).
- Conflict rule: last write wins on `updated_at`.
- Queue entries: `{ id, table, op: 'upsert' | 'delete', payload, attempts, lastError }`;
  retried with exponential backoff; flushed on app start, on reconnect, and after each local write.
- RLS policies are scoped to `auth.uid() = user_id`. Storage paths are `progress-photos/{user_id}/{uuid}.jpg`;
  photos are shown through short-lived signed URLs.
- The Supabase session is larger than SecureStore's ~2 KB value limit, so it is split into
  ≤1800-character chunks, all stored in expo-secure-store (`services/supabase/secureStorage.js`).
  The web demo build falls back to AsyncStorage (localStorage).

## Domain conventions

- Weights are **stored in kg**; convert to lb only for display/input (`utils/units.js`).
- Estimated 1RM uses the Epley formula: `weight × (1 + reps / 30)` (only for reps ≤ 12).
- PRs per exercise (table `personal_records`): `max_weight`, `max_reps` (single set), `max_e1rm`, `max_volume` (weight × reps in one set). Computed on the device, synced.
- Streak = consecutive days (or user-set weekly target) with at least one completed workout.

## Git conventions

- Repo: https://github.com/NazifaNeloy/GymBuddy
- `main` = released/graded builds only. `develop` = integration branch.
- Feature branches come off `develop`: `feat/<area>`, `fix/<area>`, `chore/<area>`, `test/<area>`, `docs/<area>`.
- Commits follow Conventional Commits: `feat(workout): add rest timer countdown`.
- One logical change per commit; tests in the same commit as the code they cover.
- Merge feature → `develop` via PR after GitHub Actions passes; `develop` → `main` for releases.
- Work is tracked on the GitHub Projects board (one issue per screen).

## Commands (once scaffolded)

```bash
npx expo start            # dev server (use a development build for Google sign-in)
npm test                  # Jest + RNTL
npx expo export -p web    # web build for Vercel
eas build -p android --profile production   # signed release APK
```

## Folder structure

```
gymbuddy/
├── CLAUDE.md
├── README.md
├── app.config.js            # reads EXPO_PUBLIC_* env vars
├── eas.json                 # build profiles (development, preview, production APK)
├── vercel.json              # web export output + /api routes
├── babel.config.js
├── jest.config.js
├── jest.setup.js            # mocks for AsyncStorage, SecureStore, NetInfo, notifications
├── package.json
├── .env.example
├── .gitignore
├── .github/
│   └── workflows/
│       └── test.yml         # lint + Jest on push/PR
├── api/                     # Vercel serverless functions (never bundled into the app)
│   └── ai-plan.js           # verifies Supabase JWT, calls Gemini, returns a routine
├── supabase/
│   ├── migrations/          # SQL: tables, indexes, RLS policies, storage policies
│   └── seed.sql             # starter exercise library
├── assets/                  # icons, splash, onboarding images, fonts
└── src/
    ├── App.js               # providers: theme, navigation, sync engine bootstrap
    ├── navigation/
    │   ├── RootNavigator.js     # onboarding → auth → main
    │   ├── AuthStack.js
    │   ├── MainTabs.js          # Home, Exercises, Workout, Progress, Profile
    │   └── linking.js           # deep links (OAuth redirect, password reset)
    ├── screens/
    │   ├── onboarding/OnboardingScreen.js
    │   ├── auth/LoginScreen.js, RegisterScreen.js, ForgotPasswordScreen.js
    │   ├── home/HomeScreen.js
    │   ├── exercises/ExerciseLibraryScreen.js, ExerciseDetailScreen.js
    │   ├── routines/RoutineListScreen.js, RoutineBuilderScreen.js
    │   ├── workout/ActiveWorkoutScreen.js, WorkoutSummaryScreen.js
    │   ├── progress/ProgressScreen.js
    │   ├── bodyStats/BodyStatsScreen.js, PhotoViewerScreen.js
    │   └── settings/ProfileSettingsScreen.js
    ├── components/
    │   ├── ui/              # Button, Card, TextField, Screen, Header, Chip, Modal
    │   ├── states/          # LoadingState, ErrorState, EmptyState, OfflineBanner
    │   ├── workout/         # SetRow, ExercisePicker, RestTimer
    │   └── charts/          # VolumeChart, OneRepMaxChart, WeightChart
    ├── store/               # Zustand
    │   ├── authStore.js
    │   ├── settingsStore.js     # theme, units, reminders (persisted)
    │   ├── exerciseStore.js
    │   ├── routineStore.js
    │   ├── workoutStore.js      # active session + history
    │   ├── bodyStatsStore.js
    │   └── syncStore.js         # queue length, last sync, online status
    ├── services/
    │   ├── supabase/
    │   │   ├── client.js        # createClient + LargeSecureStore adapter
    │   │   ├── auth.js
    │   │   └── repositories/    # exercises.js, routines.js, workouts.js, bodyStats.js
    │   ├── sync/
    │   │   ├── queue.js         # AsyncStorage-backed write queue
    │   │   └── syncEngine.js    # flush on reconnect, backoff, pull changes
    │   ├── storage/photos.js    # upload, signed URLs
    │   ├── notifications.js     # workout reminders, rest-timer alert
    │   └── ai.js                # calls Vercel /api/ai-plan
    ├── hooks/
    │   ├── useResponsive.js
    │   ├── useNetworkStatus.js
    │   └── useAsyncResource.js  # standard {data, loading, error, retry}
    ├── theme/
    │   ├── colors.js            # light + dark palettes
    │   ├── spacing.js, typography.js
    │   └── ThemeProvider.js
    ├── utils/
    │   ├── units.js             # kg ↔ lb
    │   ├── oneRepMax.js         # Epley
    │   ├── prDetection.js
    │   ├── streaks.js
    │   └── date.js
    └── constants/
        └── config.js            # reads EXPO_PUBLIC_* values
```

Tests live next to the code they cover as `*.test.js` (e.g. `src/utils/oneRepMax.test.js`).
