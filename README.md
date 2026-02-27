# Dice Odyssey

Dice Odyssey is a turn-based sci-fi strategy game built with React, TypeScript, and Vite.
Players allocate 6 dice each turn across Move, Claim, and Sabotage to race for MacGuffins before galaxy collapse.

## Gameplay (Current Rules)

- Allocate all 6 dice every playable turn.
- Color affinity applies to rolls:
	- Matching slot color: `+1`
	- Off-color slot: `-1` (minimum die value remains `1`)
- Claim checks are successful when roll is `>=` planet face.
- MacGuffin rewards are weighted by face:
	- Face `4` or `5`: +`1` MacGuffin
	- Face `6`: +`2` MacGuffins
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

### Quality + Build

```bash
npm run lint
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

## Assets + Prompt Checklist

The full asset prompt checklist and tracker live in:

- `ASSET_PROMPT_CHECKLIST.md`
