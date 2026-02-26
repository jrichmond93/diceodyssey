## Plan: Three-Phase Visual Turn Resolution for Dice Odyssey

TL;DR: Implement turn resolution visuals by separating turn intent from turn advancement, exposing a structured per-turn result payload, and progressively layering UI feedback. Phase 1 introduces a shared resolving state and interaction lock so both human and AI turns follow one sequence path. Phase 2 adds deterministic reveal UX (dice results, timeline, and a focused result panel) driven by reducer-authored turn data instead of parsing log text. Phase 3 adds board-level highlights and polish for movement, claim, sabotage, skip, and collapse events. The plan keeps existing core rules in the reducer, minimizes gameplay risk, and explicitly handles edge cases: AI auto-turn cadence, forced skipped turns, and winner/galaxy-shrink outcomes that can terminate or alter sequencing.

**Steps**
1. Phase 1 (groundwork): In [src/types.ts](src/types.ts), add typed turn-resolution models (for example TurnResolutionSnapshot, TurnResolutionStage, and optional pending flags) and extend GameState/GameAction so visuals can track resolving status without relying on text logs.
2. Phase 1 (orchestration): In [src/reducers/gameReducer.ts](src/reducers/gameReducer.ts), update resolveCurrentPlayerTurn and RESOLVE_TURN handling to persist a structured latest turn snapshot (actor, skipped state, rolls, totals, movement, sabotage target, galaxy delta, winnerAfterTurn), and ensure NEXT_PLAYER sequencing is explicitly controlled when resolution is active.
3. Phase 1 (interaction lock): In [src/App.tsx](src/App.tsx), refactor handleEndTurn and the AI useEffect auto-turn path to call one start-resolution flow; lock DicePool/TurnControls/GalaxyBoard interactions while resolving, show a global resolving indicator, and prevent double-submit/race clicks.
4. Phase 1 (controls UX): In [src/components/TurnControls.tsx](src/components/TurnControls.tsx), extend TurnControlsProps with resolving state and stage label; disable Resolve/Reset consistently for human and AI turns while sequencing is in progress.
5. Phase 2 (dice reveal + timeline): In [src/App.tsx](src/App.tsx), consume reducer turn snapshot and animate stage progression (Move → Claim → Sabotage → Post effects) using timed local UI state; include skipped-turn fast path and AI pacing parity.
6. Phase 2 (turn result panel): Add a compact turn-result surface in [src/App.tsx](src/App.tsx) (or colocated component) bound to latest snapshot fields from gameReducer symbols (resolveCurrentPlayerTurn/addLog outputs), including rolled values, affinity effects, movement delta, claim outcome, sabotage outcome, and whether collapse/win triggered.
7. Phase 2 (log alignment): In [src/components/TurnLog.tsx](src/components/TurnLog.tsx), keep groupByRound/toRenderableLog rendering but align message ordering/tags with visual timeline stages so textual history matches the staged reveal.
8. Phase 3 (board highlights): In [src/components/GalaxyBoard.tsx](src/components/GalaxyBoard.tsx), add transient highlights keyed by current snapshot (origin/destination planets, revealed/claimed planet, sabotage source/target), while preserving existing GalaxyBoardProps behavior for non-resolving states.
9. Phase 3 (polish and safety): In [src/App.tsx](src/App.tsx) and [src/components/TurnControls.tsx](src/components/TurnControls.tsx), add reduced-motion fallback, consistent loading copy for AI thinking vs resolving, and guard cleanup for timer cancellation on new game/winner transitions.

**Verification**
- Manual: Human turn with full allocation shows lock, stage progression, then unlock only after sequence completes.
- Manual: AI turn uses the same sequence path and cannot overlap with human input.
- Manual: Skipped turn path shows skip-specific sequence (no dice reveal), decrements skippedTurns, and preserves skipImmunity behavior.
- Manual: Winner on race condition halts advancement cleanly; no extra NEXT_PLAYER visual step after winnerId is set.
- Manual: Galaxy collapse on shrink interval updates board and result panel in the same resolution sequence.
- Manual: TurnLog card content/order matches staged events shown in the visual timeline.
- Quality: Run lint/type checks after each phase to catch type drift in GameState/GameAction and component props.

**Decisions**
- Use reducer-authored structured turn data (not string parsing from log) as the source of truth for visuals.
- Keep game rules in gameReducer and keep animation timing in App-level UI state to avoid introducing side effects in reducer logic.
- Route both human and AI through one resolution entrypoint to reduce edge-case divergence.
- Prefer explicit resolving/locked flags over inferred conditions from canSubmit/isAI/winnerId for safer sequencing.
- Treat winner and galaxy-shrink as post-resolution events in the same timeline so users see why flow stops or board state changes.Plan: Three-Phase Visual Turn Resolution for Dice Odyssey
TL;DR: Implement turn resolution visuals by separating turn intent from turn advancement, exposing a structured per-turn result payload, and progressively layering UI feedback. Phase 1 introduces a shared resolving state and interaction lock so both human and AI turns follow one sequence path. Phase 2 adds deterministic reveal UX (dice results, timeline, and a focused result panel) driven by reducer-authored turn data instead of parsing log text. Phase 3 adds board-level highlights and polish for movement, claim, sabotage, skip, and collapse events. The plan keeps existing core rules in the reducer, minimizes gameplay risk, and explicitly handles edge cases: AI auto-turn cadence, forced skipped turns, and winner/galaxy-shrink outcomes that can terminate or alter sequencing.

Steps

Phase 1 (groundwork): In types.ts, add typed turn-resolution models (for example TurnResolutionSnapshot, TurnResolutionStage, and optional pending flags) and extend GameState/GameAction so visuals can track resolving status without relying on text logs.
Phase 1 (orchestration): In gameReducer.ts, update resolveCurrentPlayerTurn and RESOLVE_TURN handling to persist a structured latest turn snapshot (actor, skipped state, rolls, totals, movement, sabotage target, galaxy delta, winnerAfterTurn), and ensure NEXT_PLAYER sequencing is explicitly controlled when resolution is active.
Phase 1 (interaction lock): In App.tsx, refactor handleEndTurn and the AI useEffect auto-turn path to call one start-resolution flow; lock DicePool/TurnControls/GalaxyBoard interactions while resolving, show a global resolving indicator, and prevent double-submit/race clicks.
Phase 1 (controls UX): In TurnControls.tsx, extend TurnControlsProps with resolving state and stage label; disable Resolve/Reset consistently for human and AI turns while sequencing is in progress.
Phase 2 (dice reveal + timeline): In App.tsx, consume reducer turn snapshot and animate stage progression (Move → Claim → Sabotage → Post effects) using timed local UI state; include skipped-turn fast path and AI pacing parity.
Phase 2 (turn result panel): Add a compact turn-result surface in App.tsx (or colocated component) bound to latest snapshot fields from gameReducer symbols (resolveCurrentPlayerTurn/addLog outputs), including rolled values, affinity effects, movement delta, claim outcome, sabotage outcome, and whether collapse/win triggered.
Phase 2 (log alignment): In TurnLog.tsx, keep groupByRound/toRenderableLog rendering but align message ordering/tags with visual timeline stages so textual history matches the staged reveal.
Phase 3 (board highlights): In GalaxyBoard.tsx, add transient highlights keyed by current snapshot (origin/destination planets, revealed/claimed planet, sabotage source/target), while preserving existing GalaxyBoardProps behavior for non-resolving states.
Phase 3 (polish and safety): In App.tsx and TurnControls.tsx, add reduced-motion fallback, consistent loading copy for AI thinking vs resolving, and guard cleanup for timer cancellation on new game/winner transitions.
Verification

Manual: Human turn with full allocation shows lock, stage progression, then unlock only after sequence completes.
Manual: AI turn uses the same sequence path and cannot overlap with human input.
Manual: Skipped turn path shows skip-specific sequence (no dice reveal), decrements skippedTurns, and preserves skipImmunity behavior.
Manual: Winner on race condition halts advancement cleanly; no extra NEXT_PLAYER visual step after winnerId is set.
Manual: Galaxy collapse on shrink interval updates board and result panel in the same resolution sequence.
Manual: TurnLog card content/order matches staged events shown in the visual timeline.
Quality: Run lint/type checks after each phase to catch type drift in GameState/GameAction and component props.
Decisions

Use reducer-authored structured turn data (not string parsing from log) as the source of truth for visuals.
Keep game rules in gameReducer and keep animation timing in App-level UI state to avoid introducing side effects in reducer logic.
Route both human and AI through one resolution entrypoint to reduce edge-case divergence.
Prefer explicit resolving/locked flags over inferred conditions from canSubmit/isAI/winnerId for safer sequencing.
Treat winner and galaxy-shrink as post-resolution events in the same timeline so users see why flow stops or board state changes.
If write tools become available in-session, I can save this file directly without any manual steps.