# Dice Odyssey Asset Prompt Checklist (MVP)

Use this checklist to generate or finish the image set for MVP.

## Current Asset Status

Created so far:

- [x] `public/assets/branding/dice-odyssey-logo.png`
- [x] `public/assets/branding/hero-banner.png`
- [x] `public/assets/ui/icon-action-move.png`
- [x] `public/assets/ui/icon-action-claim.png`
- [x] `public/assets/ui/die-red.png`
- [x] `public/assets/ui/die-blue.png`
- [x] `public/assets/ui/die-green.png`
- [x] `public/assets/ui/die-neutral.png`
- [x] `public/assets/ui/dice-set-overview.png`
- [x] `public/assets/ui/icon-status-success.svg`
- [x] `public/assets/ui/icon-status-fail.svg`
- [x] `public/assets/ui/icon-status-neutral.svg`

## Global Art Direction (use in every prompt)

- Style: clean sci-fi UI, semi-flat/vector-friendly, crisp edges.
- Palette: dark navy/slate base with cyan + emerald accents and occasional amber/red warnings.
- Readability: must remain clear at small sizes (24px+ for icons).
- Avoid: copyrighted characters/logos, photoreal clutter, hard-to-read tiny details.

## Folder + Naming Plan

- `public/assets/branding/`
- `public/assets/ui/`
- `public/assets/infographics/`

## Must-Have Image Prompt Checklist

### Branding

- [x] `public/assets/branding/dice-odyssey-logo.png` (plus transparent SVG if available) — target 512x512 master
  - Prompt:
    - Create a futuristic game logo for Dice Odyssey. Combine a six-sided die motif and a cosmic travel theme (stars, orbital arc, subtle ship trail). Typography should read DICE ODYSSEY in bold geometric sci-fi lettering. Mood is adventurous, strategic, and clean. Use deep navy with cyan/white highlights and a small amber accent. Deliver transparent background, centered composition, non-photoreal.

- [x] `public/assets/branding/hero-banner.png` — target 1600x600
  - Prompt:
    - Wide hero banner for a sci-fi strategy dice game called Dice Odyssey. Show a starfield galaxy with glowing planets arranged like a race path, floating dice energy trails, and a small captain ship racing toward a luminous artifact. Keep left-center safe empty space for UI text overlay. Cinematic but clean and uncluttered. Palette: dark navy with cyan, violet, and emerald accents.

### Action Icons

- [x] `public/assets/ui/icon-action-move.png` (SVG optional) — target 128x128
  - Prompt:
    - Minimal vector icon for Move action: a die with thrust trail and forward arrow to imply speed and travel. Flat/semi-flat style, transparent background, centered, no text, no border. Cyan/blue accents on dark-neutral shape. Must be readable at 24px.

- [x] `public/assets/ui/icon-action-claim.png` (SVG optional) — target 128x128
  - Prompt:
    - Minimal vector icon for Claim action: scanning reticle over a planet with a small flag or check marker to imply capture. Flat/semi-flat style, transparent background, centered, no text. Green/emerald accents with subtle cyan. Must be readable at 24px.

- [ ] `public/assets/ui/icon-action-sabotage.svg` (PNG fallback: 128x128)
  - Prompt:
    - Minimal vector icon for Sabotage action: EMP burst or lightning disrupting a rival ship silhouette, with warning motif. Flat/semi-flat style, transparent background, centered, no text. Red/amber accents on dark-neutral base. Must be readable at 24px.

### Dice Assets

- [x] `public/assets/ui/die-red.svg` (PNG fallback: 128x128, PNG completed)
  - Prompt:
    - Minimal vector icon for a red six-sided die used in Dice Odyssey. Rounded-corner square die body with clearly visible pips, subtle sci-fi bevel, and strong silhouette. Transparent background, centered, no text, no border frame. Red primary with dark-neutral shadows and tiny amber warning accent. Must stay readable at 24px.

- [x] `public/assets/ui/die-blue.svg` (PNG fallback: 128x128, PNG completed)
  - Prompt:
    - Minimal vector icon for a blue six-sided die used in Dice Odyssey. Rounded-corner square die body with clearly visible pips, subtle sci-fi bevel, and strong silhouette. Transparent background, centered, no text, no border frame. Cyan/blue primary with dark-neutral shadows. Must stay readable at 24px.

- [x] `public/assets/ui/die-green.svg` (PNG fallback: 128x128, PNG completed)
  - Prompt:
    - Minimal vector icon for a green six-sided die used in Dice Odyssey. Rounded-corner square die body with clearly visible pips, subtle sci-fi bevel, and strong silhouette. Transparent background, centered, no text, no border frame. Emerald/green primary with dark-neutral shadows and a subtle cyan glow. Must stay readable at 24px.

- [x] `public/assets/ui/die-neutral.svg` (PNG fallback: 128x128, PNG completed)
  - Prompt:
    - Minimal vector icon for a neutral/default six-sided die used in Dice Odyssey for generic UI states. Rounded-corner square die body with clear pips, semi-flat sci-fi style, transparent background, centered, no text. Slate/gray primary with cyan edge light. Must stay readable at 24px.

- [x] `public/assets/ui/dice-set-overview.png` — target 800x400
  - Prompt:
    - UI-ready showcase image of four Dice Odyssey dice (red, blue, green, neutral) arranged cleanly in a row on transparent or very dark background. Semi-flat sci-fi style, crisp edges, no text, no extra props, generous spacing for readability. High contrast and uncluttered.

### Planet State Icons

- [ ] `public/assets/ui/icon-planet-unknown.svg` (PNG fallback: 96x96)
  - Prompt:
    - Vector icon for planet state Unknown: dark planet with subtle glow and a prominent question mark overlay. Mysterious but readable. Transparent background, centered, no extra text. Style matches sci-fi UI icon set.

- [ ] `public/assets/ui/icon-planet-barren.svg` (PNG fallback: 96x96)
  - Prompt:
    - Vector icon for planet state Barren: rocky gray cratered planet with low-energy appearance and no implied resources. Transparent background, centered. Style consistent with sci-fi game UI icon set.

- [ ] `public/assets/ui/icon-planet-event.svg` (PNG fallback: 96x96)
  - Prompt:
    - Vector icon for planet state Event: unstable planet with anomaly ring or pulse wave suggesting random event. Transparent background, centered, no text. Violet/cyan accents.

- [ ] `public/assets/ui/icon-planet-macguffin.svg` (PNG fallback: 96x96)
  - Prompt:
    - Vector icon for planet state MacGuffin-rich: glowing planet with embedded artifact shard or bright core, clearly valuable. Transparent background, centered, no text. Emerald/gold accents with high contrast.

### MacGuffin Token

- [ ] `public/assets/ui/icon-macguffin-token.svg` (PNG fallback: 128x128)
  - Prompt:
    - Create a collectible token icon for a mysterious cosmic artifact called MacGuffin. Shape should be a crystalline relic with energy core, simple and iconic for score counters. Transparent background, centered, no text. Sci-fi semi-flat style with emerald and cyan glow, readable at small size.

### On-Screen Help Graphic

- [ ] `public/assets/infographics/turn-flow-infographic.png` — target 1200x400
  - Prompt:
    - Horizontal onboarding infographic showing 3-step flow: 1) Allocate 6 dice, 2) End Turn, 3) Resolve actions (Move then Claim then Sabotage). Use simple iconography, arrows between steps, clear hierarchy, minimal text, dark sci-fi UI style matching icon set. Keep spacing generous and readable.

## Completion Checklist

- [ ] All files exported with final filenames above.
- [ ] Transparent backgrounds for icons/logos where applicable.
- [ ] SVG + PNG fallback for icon set.
- [ ] Dice assets exported as SVG + PNG fallback.
- [ ] Visual consistency across all assets.
- [ ] Files placed in `public/assets/...` folders.

## Hand-off

When this checklist is complete, send: "assets ready". I will then implement all image wiring into the app UI.
