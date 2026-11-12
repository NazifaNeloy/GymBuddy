# AGENTS.md

Instructions for any AI coding agent working on this repo (Antigravity, Cursor, Claude Code, …).

The full project rules live in CLAUDE.md and the current status in docs/HANDOFF.md.
Read both before making changes:

@CLAUDE.md
@docs/HANDOFF.md

Short version:
- Build one step at a time and wait for the user's "continue".
- Small Conventional Commits on `feat/*` branches off `develop`; never commit to `main`.
- Every screen needs loading, error and empty states; light/dark via theme tokens; phone + tablet.
- Offline-first: write locally, enqueue via `src/services/sync/queue.js`, let the sync engine upload.
- No secret keys in the app. Run `npm run lint` and `npm test` before every commit.
