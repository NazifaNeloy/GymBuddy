# GymBuddy — handoff notes (state as of 2026-11-13)

Read `CLAUDE.md` first: it holds the rules (stack, non-negotiables, sync conventions, git workflow).
This file says what exists, what is left, and the traps already hit. No secrets are stored here.

## Accounts and IDs (not secret)

| What | Value |
|---|---|
| GitHub | `NazifaNeloy/GymBuddy` — `main` (graded releases), `develop` (integration), both protected: PR + green **test** check required |
| Supabase project | ref `ndgnpkjvmspgdsrifxbe` (Postgres 17, region ap-northeast-2, Free plan) |
| Expo / EAS | owner `nazifaneloys-team`, slug `gymbuddy`, projectId `5daeb354-a2e1-4ecd-a2f7-2f8d601b65bb` (in `app.config.js`) |
| App ids | Android package / iOS bundle `com.nazifaneloy.gymbuddy`, deep-link scheme `gymbuddy://` |
| Google OAuth | Web client in Google Cloud project "GymBuddy" (Testing mode, 5 test users). Client ID + secret live **only** in Supabase → Auth → Providers → Google |
| Supabase Auth URLs | Site URL `gymbuddy://auth/callback`; redirect URLs `gymbuddy://**`, `exp://**`, `http://localhost:8081/**` (add the Vercel URL later) |

Local `.env` (git-ignored) needs real values for `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Placeholders from `.env.example` are rejected by `src/constants/config.js` (see open PR below).

## Done (merged into develop)

| Step | What | Key files |
|---|---|---|
| Scaffold | Expo SDK 58 / RN 0.88, JS, Jest + RNTL, ESLint, GitHub Actions (`.github/workflows/test.yml`) | `app.config.js`, `eas.json`, `jest.setup.js` |
| Database | 8 tables with RLS, sync trigger, private `progress-photos` bucket, 40 exercises + 3 starter routines | `supabase/migrations/*`, `supabase/README.md` |
| Auth | Email/password, register, forgot/reset password, Google OAuth (browser flow), session in chunked SecureStore, auth-gated navigation | `src/services/supabase/*`, `src/store/authStore.js`, `src/screens/auth/*`, `docs/auth-setup.md` |
| UI kit | Theme tokens (light/dark, follows system), `Screen`, `Button`, `TextField`, `Chip`, `Card`, `Stepper`, `Banner`, Loading/Error/Empty/Offline/SyncStatus | `src/theme/*`, `src/components/*` |
| 6.1 Exercises | Library (search, muscle chips, responsive grid, offline cache) + Detail | `src/screens/exercises/*`, `src/store/exerciseStore.js` |
| 6.2 Routines | List, builder (days, targets, reorder, delete, discard guard), exercise picker, starter-template copy | `src/screens/routines/*`, `src/store/routineStore.js`, `src/utils/routineDraft.js` |
| Offline sync | Persistent FIFO queue, coalescing, backoff, LWW merge, ordered push + incremental pull, triggers on start/reconnect/foreground/local write | `src/services/sync/*`, `src/hooks/useSyncEngine.js` |

Tests: 196 passing on develop (`npm test`). Lint clean (`npm run lint`). Web bundles (`npx expo export -p web`).

**Open PR:** `fix/config-placeholders` — treats placeholder/malformed `.env` values as "not configured". Merge it.

## Verified on real devices

- Web (`localhost:8081`): Google sign-in works.
- iPhone (Expo Go): app loads, dark mode follows the phone. Sign-in on the phone failed only because Expo Go kept a bundle built with the placeholder `.env`; fix = restart `npx expo start --go -c` and rescan. **Re-test phone sign-in first.**

## Left to build

1. **Icons** — user approved `@expo/vector-icons` (`npx expo install @expo/vector-icons`). Add to tabs and main buttons.
2. **6.3 Active Workout** — log sets (reps, weight in kg, lb display), rest timer + notification, finish & save. Reuse the sync engine: add a `workoutStore` that registers pull targets for `workouts` then `workout_sets` and enqueues upserts (pattern: `routineStore.js`). Add more sync-queue tests as requested.
3. **6.4 Progress** — gifted-charts (volume, e1RM via DB column `estimated_1rm_kg`), PR detection into `personal_records` (computed on device, synced), streaks, progressive-overload suggestion.
4. **6.5 Body Stats** — weight log (`body_stats`) + photos via expo-image-picker to bucket `progress-photos/{user_id}/{uuid}.jpg`, signed URLs. Storage policies already exist.
5. **6.6 Home + Profile/Settings** — today's workout, streak, weekly summary; theme toggle System/Light/Dark (`ThemeProvider` already takes `preference`), kg/lb, reminders (expo-notifications); move Sign out here (keep the unsynced-changes warning from `HomeScreen.js`). Optionally sync settings to `profiles`.
6. **Onboarding screen** (goal, experience, units → `profiles`).
7. **Vercel** — `vercel.json`, Expo web export, `api/ai-plan.js` (verify Supabase JWT, call Gemini; `GEMINI_API_KEY` only in Vercel env). Add the Vercel URL to Supabase redirect URLs.
8. **Release** — `eas build -p android --profile production` (let EAS create the keystore), test the APK on an Android phone, merge `develop` → `main`.
9. **Email delivery** — built-in Supabase SMTP only sends to org members; set custom SMTP (e.g. Gmail app password) before the demo.
10. Optional: GitHub Projects board script (`setup-github-board.sh`, run locally with `gh auth refresh -s project`).

## How to add a new synced table (checklist)

1. Migration in `supabase/migrations/` with `id uuid`, `user_id`, `created_at`, `updated_at`, `deleted_at`, `synced_at`,
   `before insert or update` trigger `sync_row_guard()`, RLS policies scoped to `(select auth.uid())`, indexes on `(user_id, synced_at)`.
   (Tables for 6.3–6.5 already exist.)
2. Store with `persist` (AsyncStorage) holding `{ [id]: row }`; write locally first, then `queue.enqueue({ table, payload })`
   with only client-writable columns (never `synced_at` or generated columns). Deletes = soft delete via upsert.
3. `registerPullTarget({ table, columns, getCursor, applyRemote })` — parents before children; merge with `mergeRows`.
4. Reset the store on sign-out in `src/App.js`.

## Traps already hit

- `.env` is inlined at bundle time: after editing it run `npx expo start --go -c`, then fully quit and reopen Expo Go.
- `expo-dev-client` is installed, so plain `npx expo start` serves a dev-build QR; use `--go` for Expo Go.
- Expo Go needs to be signed in to the same Expo account as `npx expo login`.
- Built-in Supabase email: only to org members (`email_address_not_authorized` otherwise; the app shows a clear message).
- Uploading a child row before its parent fails with Postgres `42501` (RLS check) — the engine backs off and retries; keep parents first in the queue.
- ESLint (React Compiler rules) rejects `setState` inside `useEffect`; adjust state during render or derive it.
- Zustand selectors must not return new arrays/objects each render; select raw maps and `useMemo` the derived lists.
- `Alert` does nothing on web — use `utils/confirm.js`.
- Native-stack headers are not rendered in Jest; navigate via a `NavigationContainer` ref in tests.
- zsh: don't paste commands with trailing `# comments`.
