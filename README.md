# Dice Odysseys

Dice Odysseys is a turn-based sci-fi strategy game built with React, TypeScript, and Vite.
Players allocate 6 dice each turn across Move, Claim, and Sabotage to race for MacGuffins before galaxy collapse.

Live domain: https://diceodysseys.com

## Gameplay (Current Rules)

- Allocate all 6 dice every playable turn.
- Color affinity applies to rolls:
	- Matching slot color: `+1`
	- Off-color slot: `-1` (minimum die value remains `1`)
- Move is capped at galaxy end, but if you start a turn on the last planet and it is already claimed, your move goes backward by your move total.
- Claim checks are successful when roll is `>=` planet face.
- MacGuffin rewards are weighted by face:
	- Face `3`: +`1` MacGuffin
	- Face `4`: +`2` MacGuffins
	- Face `5`: +`3` MacGuffins
	- Face `6`: +`4` MacGuffins
- Perfect Claim bonus: if all assigned claim dice succeed on that landed planet, the reward is doubled (cap `+8` MacGuffins from that claim).
- Sabotage targets the nearest rival within range and can add skipped turns.
- Win conditions:
	- Reach `5` MacGuffins (race victory), or
	- If galaxy collapse ends the game: highest MacGuffins, then farthest position, then fewest pending skips.

## Notable UI Features

- Turn Resolution playback with die-face visuals.
- Round Recap panel (human-focused context in mixed human/AI games).
- Optional 2-second Resolve animation overlay before resolution.
- Turn Log with compact roll-icon strips.
- In-game Help & Tips panel and post-game debrief.
- Optional debug logging with downloadable JSON export.

## Development

### Prerequisites

- Node.js `18+` (LTS recommended)
- npm

### Run Locally

```bash
npm install
npm run dev
```

### Run Multiplayer Locally (Frontend + API)

Multiplayer API routes in `api/` are serverless handlers and are not served by Vite alone.

Use two terminals:

Terminal 1 (API runtime):

```bash
npm run dev:api
```

If Vercel reports an invalid token, refresh your local auth first:

```bash
npx vercel login
```

Terminal 2 (frontend):

```bash
npm run dev
```

Notes:
- API runtime is served on `http://localhost:3001` in API-only mode.
- Vite proxies `/api/*` requests to `http://localhost:3001` in development.
- If `dev:api` is not running, multiplayer actions like `Start Online Match` return fetch/proxy errors.
- `dev:api` uses `vercel.api.local.json` to serve only `api/**/*.ts` handlers from repository root (avoids `vercel dev api` route-discovery issues and avoids frontend rewrite conflicts from `vercel.json`).
- API runtime now loads `.env.local` automatically; ensure these server vars are set for local multiplayer API: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH0_DOMAIN` (and optional `AUTH0_AUDIENCE`).
- Optional Phase 7 hardening vars:
	- `QUEUE_RATE_LIMIT_PER_MINUTE` (default `20`)
	- `TURN_INTENT_RATE_LIMIT_PER_MINUTE` (default `120`)

If you previously linked root `vercel dev` and hit Vite import-analysis errors on `index.html`, keep using `npm run dev:api` (API-only) plus `npm run dev` in a second terminal.

### Multiplayer Phase 0 Environment Setup

1. Copy `.env.example` to `.env.local`.
2. Set Auth0 values:
	- `VITE_AUTH0_DOMAIN`
	- `VITE_AUTH0_CLIENT_ID`
	- `VITE_AUTH0_AUDIENCE` (optional)
	- `VITE_AUTH0_REDIRECT_URI`
	- `VITE_AUTH0_LOGOUT_URI`
3. Set Supabase values:
	- `VITE_SUPABASE_PROJECT_REF` (V1: `supabase-ideobridge`)
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`

Multiplayer environment access is defined in `src/multiplayer/env.ts` and typed via `src/vite-env.d.ts`.

### Phase 2 Auth Notes

- Auth0 is initialized in `src/main.tsx` with `Auth0Provider`.
- Multiplayer eligibility is computed in `src/multiplayer/auth.ts`.
- In V1, authentication is required for multiplayer entry, while local single/hotseat play remains public.

### Phase 3 API Notes

- API routes are implemented for Vercel serverless runtime:
	- `POST /api/matchmaking/queue`
	- `POST /api/sessions/:id/join`
	- `GET /api/sessions/:id`
	- `POST /api/sessions/:id/turn-intent`
- Server runtime env vars are required for these routes:
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
	- `AUTH0_DOMAIN`
	- `AUTH0_AUDIENCE` (optional but recommended)
- Required Supabase tables for local/remote multiplayer API:
	- Run `docs/supabase-multiplayer-bootstrap.sql` in Supabase SQL Editor once to create
	  `dice_sessions`, `dice_player_seats`, `dice_turn_intents`, and `dice_session_events`.
	- Run `docs/sql/multiplayer-match-discovery-supabase.sql` for profile storage used by `/api/profile`.
	- Run `docs/sql/multiplayer-avatar-v1.sql` to add `avatar_key` support for profile avatar selection and seat snapshots.

### Phase 4 Realtime Notes

- Server publishes best-effort realtime broadcasts to `dice_session:{sessionId}` topics.
- Realtime publishing helpers are in `api/_lib/realtime.ts`.
- Client session subscription lifecycle + reconnect snapshot refresh fallback is in `src/multiplayer/realtime.ts`.

### Quality + Build

```bash
npm run lint
npm run test
npm run build
npm run preview
```

## Deploy to Vercel

This project is already configured for Vercel in `vercel.json`:

- Framework: `vite`
- Build command: `npm run build`
- Output directory: `dist`
- SPA rewrite to `index.html`

### Deploy Steps

1. Ensure local checks pass:
	 - `npm run lint`
	 - `npm run build`
2. Commit and push to your remote repository.
3. Import the repository in Vercel (or connect an existing project).
4. Deploy (Vercel will use the existing `vercel.json` settings).

### Required Vercel Environment Variables

Set these in Project Settings → Environment Variables (Production and Preview):

- Client/runtime (`VITE_*`):
	- `VITE_AUTH0_DOMAIN`
	- `VITE_AUTH0_CLIENT_ID`
	- `VITE_AUTH0_AUDIENCE`
	- `VITE_AUTH0_REDIRECT_URI`
	- `VITE_AUTH0_LOGOUT_URI`
	- `VITE_SUPABASE_PROJECT_REF` (`supabase-ideobridge`)
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`
- API/server runtime:
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
	- `AUTH0_DOMAIN`
	- `AUTH0_AUDIENCE`
	- `QUEUE_RATE_LIMIT_PER_MINUTE` (optional)
	- `TURN_INTENT_RATE_LIMIT_PER_MINUTE` (optional)

Notes:
- Ensure `AUTH0_DOMAIN` is host-only (for example: `your-tenant.us.auth0.com`, no `https://`).
- API handlers require `SUPABASE_SERVICE_ROLE_KEY`; multiplayer APIs will fail with 500/401 without it.
- Run `docs/supabase-multiplayer-bootstrap.sql` once in the target Supabase project to create `dice_` tables.
- Run `docs/sql/multiplayer-match-discovery-supabase.sql` and `docs/sql/multiplayer-avatar-v1.sql` to enable profile + avatar persistence.

### Post-Deploy Multiplayer Smoke

1. Log in as User A and click `Start Online Match`.
2. Copy the session ID and join from User B (`Join`).
3. Confirm both clients show matching session/version state.
4. Submit alternating turns for at least 3 rounds.
5. Verify stale-version actions are rejected without desync.
6. Refresh/reconnect one client and confirm snapshot rehydration.

## Assets + Prompt Checklist

The full asset prompt checklist and tracker live in:

- `ASSET_PROMPT_CHECKLIST.md`
