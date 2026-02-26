import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Navigate, useLocation } from 'react-router-dom'
import { AppFooter } from './components/AppFooter'
import { DicePool } from './components/DicePool'
import { GalaxyBoard } from './components/GalaxyBoard'
import { PlayerStatus } from './components/PlayerStatus'
import { TurnResolution } from './components/TurnResolution'
import { TurnLog } from './components/TurnLog'
import { TurnControls } from './components/TurnControls'
import { AboutPage } from './pages/AboutPage'
import { emptyAllocation, gameReducer, initialGameState } from './reducers/gameReducer'
import type { Allocation, Difficulty, GameMode, TurnResolutionPlaybackStage } from './types'
import { buildPostGameNarrative } from './utils/buildPostGameNarrative'

const HELP_STORAGE_KEY = 'dice-odyssey-help-open'
const AI_THINK_DELAY_MS = 600
const RESOLVE_STAGE_DELAY_MS = 240
const REDUCED_MOTION_STAGE_DELAY_MS = 80
const REDUCED_MOTION_AI_DELAY_MS = 200
const MACGUFFIN_TOKEN_ICON = '/assets/ui/icon-macguffin-token.png'

const allDiceAllocated = (allocation: Allocation): boolean =>
  allocation.move.length + allocation.claim.length + allocation.sabotage.length === 6

function App() {
  const location = useLocation()
  const [state, dispatch] = useReducer(gameReducer, initialGameState)
  const [mode, setMode] = useState<GameMode>('single')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [humanName, setHumanName] = useState('Captain')
  const [aiCount, setAiCount] = useState(2)
  const [hotseatCount, setHotseatCount] = useState(2)
  const [hotseatNames, setHotseatNames] = useState('Captain 1, Captain 2')
  const [debugEnabled, setDebugEnabled] = useState(false)
  const [draftAllocation, setDraftAllocation] = useState<Allocation>(emptyAllocation())
  const [showDebrief, setShowDebrief] = useState(false)
  const [playbackStage, setPlaybackStage] = useState<TurnResolutionPlaybackStage>('idle')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const resolutionTimersRef = useRef<number[]>([])
  const [helpOpen, setHelpOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(HELP_STORAGE_KEY) === 'true'
  })

  const currentPlayer = state.players[state.currentPlayerIndex]
  const resolveStageDelay = prefersReducedMotion ? REDUCED_MOTION_STAGE_DELAY_MS : RESOLVE_STAGE_DELAY_MS
  const aiThinkDelay = prefersReducedMotion ? REDUCED_MOTION_AI_DELAY_MS : AI_THINK_DELAY_MS
  const isResolving = state.turnResolution.active
  const resolvingMessage =
    playbackStage === 'move'
      ? 'Resolving move rolls...'
      : playbackStage === 'claim'
        ? 'Resolving claim rolls...'
        : playbackStage === 'sabotage'
          ? 'Resolving sabotage rolls...'
          : playbackStage === 'post'
            ? 'Applying post effects...'
            : state.turnResolution.message

  const clearResolutionTimers = useCallback(() => {
    resolutionTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    resolutionTimersRef.current = []
  }, [])

  useEffect(() => {
    setDraftAllocation(emptyAllocation())
  }, [state.currentPlayerIndex, state.started])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(media.matches)
    update()

    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    return () => clearResolutionTimers()
  }, [clearResolutionTimers])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(HELP_STORAGE_KEY, String(helpOpen))
  }, [helpOpen])

  useEffect(() => {
    if (state.winnerId) {
      setShowDebrief(true)
    }
  }, [state.winnerId])

  useEffect(() => {
    if (!state.started || typeof window === 'undefined') {
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [state.started])

  const winnerName = useMemo(
    () => state.players.find((player) => player.id === state.winnerId)?.name,
    [state.players, state.winnerId],
  )

  const winnerPlayer = useMemo(
    () => state.players.find((player) => player.id === state.winnerId),
    [state.players, state.winnerId],
  )

  const currentRound = useMemo(() => {
    const playerCount = Math.max(state.players.length, 1)
    return Math.floor((state.turn - 1) / playerCount) + 1
  }, [state.players.length, state.turn])

  const postGameNarrative = useMemo(
    () =>
      buildPostGameNarrative({
        players: state.players,
        log: state.log,
        winnerId: state.winnerId,
        winnerReason: state.winnerReason,
        turn: state.turn,
      }),
    [state.players, state.log, state.winnerId, state.winnerReason, state.turn],
  )

  const startResolutionFlow = useCallback((allocation?: Allocation) => {
    if (!state.started || state.winnerId || !currentPlayer || isResolving) {
      return
    }

    const isSkippedTurn = currentPlayer.skippedTurns > 0

    dispatch({
      type: 'START_TURN_RESOLUTION',
      payload: {
        stage: 'resolving',
        message: isSkippedTurn
          ? `${currentPlayer.name} is resolving post effects...`
          : `${currentPlayer.name} is resolving Move → Claim → Sabotage...`,
      },
    })

    setPlaybackStage(isSkippedTurn ? 'post' : 'move')

    if (allocation) {
      dispatch({ type: 'ALLOCATE_DICE', payload: allocation })
    }

    dispatch({ type: 'RESOLVE_TURN' })

    clearResolutionTimers()

    if (!isSkippedTurn) {
      resolutionTimersRef.current.push(
        window.setTimeout(() => {
          setPlaybackStage('claim')
        }, resolveStageDelay),
      )
      resolutionTimersRef.current.push(
        window.setTimeout(() => {
          setPlaybackStage('sabotage')
        }, resolveStageDelay * 2),
      )
      resolutionTimersRef.current.push(
        window.setTimeout(() => {
          setPlaybackStage('post')
        }, resolveStageDelay * 3),
      )
    }

    resolutionTimersRef.current.push(window.setTimeout(() => {
      dispatch({ type: 'NEXT_PLAYER' })
      dispatch({ type: 'END_TURN_RESOLUTION' })
      setPlaybackStage('idle')
      resolutionTimersRef.current = []
    }, isSkippedTurn ? resolveStageDelay * 2 : resolveStageDelay * 4))
  }, [state.started, state.winnerId, currentPlayer, isResolving, clearResolutionTimers, resolveStageDelay])

  useEffect(() => {
    if (!state.started || state.winnerId || !currentPlayer?.isAI || isResolving) {
      return
    }

    const timer = window.setTimeout(() => {
      startResolutionFlow()
    }, aiThinkDelay)

    return () => window.clearTimeout(timer)
  }, [state.started, state.winnerId, currentPlayer?.id, currentPlayer?.isAI, isResolving, startResolutionFlow, aiThinkDelay])

  const handleStart = () => {
    if (mode === 'hotseat') {
      const parsed = hotseatNames
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, hotseatCount)

      const names = Array.from({ length: hotseatCount }, (_, index) => {
        return parsed[index] || `Captain ${index + 1}`
      })

      dispatch({
        type: 'INIT_GAME',
        payload: {
          mode,
          humanNames: names,
          aiCount: 0,
          difficulty,
          debugEnabled,
        },
      })
      return
    }

    dispatch({
      type: 'INIT_GAME',
      payload: {
        mode,
        humanNames: [humanName.trim() || 'Captain'],
        aiCount,
        difficulty,
        debugEnabled,
      },
    })
  }

  const handleEndTurn = () => {
    if (!currentPlayer || currentPlayer.isAI || isResolving) {
      return
    }

    if (currentPlayer.skippedTurns > 0) {
      startResolutionFlow()
      return
    }

    if (!allDiceAllocated(draftAllocation)) {
      return
    }

    startResolutionFlow(draftAllocation)
  }

  const handleAllocatePreferred = () => {
    if (!currentPlayer || currentPlayer.isAI || currentPlayer.skippedTurns > 0 || state.winnerId || isResolving) {
      return
    }

    const preferred = currentPlayer.dicePool.reduce<Allocation>((next, die) => {
      if (die.color === 'blue') {
        next.move.push(die.id)
        return next
      }

      if (die.color === 'green') {
        next.claim.push(die.id)
        return next
      }

      next.sabotage.push(die.id)
      return next
    }, emptyAllocation())

    setDraftAllocation(preferred)
  }

  const handleNewGame = () => {
    clearResolutionTimers()
    setPlaybackStage('idle')
    setShowDebrief(false)
    dispatch({ type: 'NEW_GAME' })
  }

  const handleDownloadDebugLog = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      winnerId: state.winnerId,
      winnerReason: state.winnerReason,
      players: state.players,
      turn: state.turn,
      debugLog: state.debugLog,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `dice-odyssey-debug-${Date.now()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (location.pathname === '/about') {
    return (
      <div className="flex min-h-screen flex-col">
        <AboutPage />
        <AppFooter />
      </div>
    )
  }

  if (location.pathname !== '/') {
    return <Navigate to="/" replace />
  }

  if (!state.started) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center p-6">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-6">
          <img
            src="/assets/branding/hero-banner.png"
            alt="Dice Odyssey hero banner"
            className="mb-4 h-auto w-full rounded-xl border border-slate-700 object-cover"
          />

          <div className="flex items-center gap-3">
            <img
              src="/assets/branding/dice-odyssey-logo.png"
              alt="Dice Odyssey logo"
              className="h-20 w-20 rounded-md border border-slate-700 object-cover"
            />
            <div className="flex flex-col md:flex-row md:items-baseline md:gap-3">
              <h1 className="text-3xl font-bold text-cyan-200">Dice Odyssey</h1>
              <p className="text-slate-300">A dice-powered race for cosmic MacGuffins.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <h2 className="text-sm font-semibold text-cyan-200">What</h2>
              <p className="mt-1 text-xs text-slate-300">
                Dice Odyssey is a turn-based space race. Move across planets, claim MacGuffins,
                and disrupt rivals before the galaxy collapses.
              </p>
            </article>
            <article className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <h2 className="text-sm font-semibold text-cyan-200">How</h2>
              <p className="mt-1 text-xs text-slate-300">
                Assign all 6 dice to Move, Claim, or Sabotage. Any color can go anywhere.
                Matching color to slot gets +1 roll value; off-color gets -1 (minimum 1).
              </p>
            </article>
            <article className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <h2 className="text-sm font-semibold text-cyan-200">Win</h2>
              <p className="mt-1 text-xs text-slate-300">
                Reach 5 MacGuffins first for race victory. If the galaxy runs out, survival winner
                is highest MacGuffins, then farthest distance, then fewest pending skips.
              </p>
            </article>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-200">
              Mode
              <select
                className="rounded-md border border-slate-600 bg-slate-900 p-2"
                value={mode}
                onChange={(event) => setMode(event.target.value as GameMode)}
              >
                <option value="single">Single Player (vs AI)</option>
                <option value="hotseat">Hotseat Multiplayer</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-200">
              AI Difficulty
              <select
                className="rounded-md border border-slate-600 bg-slate-900 p-2"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as Difficulty)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
              </select>
            </label>

            {mode === 'single' ? (
              <>
                <label className="flex flex-col gap-1 text-sm text-slate-200">
                  Your Name
                  <input
                    className="rounded-md border border-slate-600 bg-slate-900 p-2"
                    value={humanName}
                    onChange={(event) => setHumanName(event.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-200">
                  AI Opponents
                  <select
                    className="rounded-md border border-slate-600 bg-slate-900 p-2"
                    value={aiCount}
                    onChange={(event) => setAiCount(Number(event.target.value))}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-sm text-slate-200">
                  Players
                  <select
                    className="rounded-md border border-slate-600 bg-slate-900 p-2"
                    value={hotseatCount}
                    onChange={(event) => setHotseatCount(Number(event.target.value))}
                  >
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-200 md:col-span-2">
                  Player Names (comma-separated)
                  <input
                    className="rounded-md border border-slate-600 bg-slate-900 p-2"
                    value={hotseatNames}
                    onChange={(event) => setHotseatNames(event.target.value)}
                    placeholder="Captain 1, Captain 2"
                  />
                </label>
              </>
            )}
          </div>

          <button
            type="button"
            className="mt-6 rounded-md bg-cyan-500 px-5 py-2 font-semibold text-slate-950"
            onClick={handleStart}
          >
            Start Game
          </button>

          <label className="mt-3 flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 p-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={debugEnabled}
              onChange={(event) => setDebugEnabled(event.target.checked)}
            />
            Enable debug logging (captures every turn for post-game analysis)
          </label>
          </div>
        </div>
        <AppFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DndProvider backend={HTML5Backend}>
        <div className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/branding/dice-odyssey-logo.png"
              alt="Dice Odyssey logo"
              className="h-14 w-14 rounded-md border border-slate-700 object-cover"
            />
            <div>
              <h1 className="text-2xl font-bold text-cyan-200">Dice Odyssey</h1>
              <p className="text-sm text-slate-300">
                Round {currentRound} · Turn {state.turn} · Current: {currentPlayer?.name ?? '—'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-100"
              onClick={() => setHelpOpen((value) => !value)}
            >
              {helpOpen ? 'Hide Help & Tips' : 'Show Help & Tips'}
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-100"
              onClick={handleNewGame}
            >
              New Game
            </button>
          </div>
        </header>

        {state.winnerId && (
          <section className="space-y-3 rounded-xl border border-emerald-400 bg-emerald-900/30 p-4 text-emerald-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                Winner: {winnerName} ({state.winnerReason === 'race' ? 'Race Victory' : 'Survival Victory'})
              </p>
              <button
                type="button"
                className="rounded border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-100"
                onClick={() => setShowDebrief((value) => !value)}
              >
                {showDebrief ? 'Hide Story' : 'Show Story'}
              </button>
            </div>

            {winnerPlayer && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-100">
                <span>Winner MacGuffins:</span>
                <img
                  src={MACGUFFIN_TOKEN_ICON}
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 rounded object-cover"
                />
                <span className="font-semibold">{winnerPlayer.macGuffins}</span>
              </p>
            )}

            {showDebrief && (
              <div className="space-y-2 rounded-lg border border-emerald-500/40 bg-slate-950/40 p-3 text-sm text-emerald-50">
                <p className="font-semibold text-emerald-200">Post-Game Debrief</p>
                <p>{postGameNarrative.headline}</p>
                <p className="font-semibold text-emerald-200">Key Moments</p>
                <ul className="list-disc space-y-1 pl-5">
                  {postGameNarrative.keyMoments.map((moment) => (
                    <li key={moment}>{moment}</li>
                  ))}
                </ul>
                <p className="font-semibold text-emerald-200">Stats</p>
                <ul className="list-disc space-y-1 pl-5">
                  {postGameNarrative.stats.map((stat) => (
                    <li key={stat}>{stat}</li>
                  ))}
                </ul>
                <p className="font-semibold text-emerald-200">Why This Winner</p>
                <p>{postGameNarrative.whyWinner}</p>
              </div>
            )}
          </section>
        )}

        {helpOpen && (
          <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <h2 className="text-lg font-semibold text-slate-100">Help & Tips</h2>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-300">
                <p className="font-semibold text-cyan-200">Turn Flow</p>
                <img
                  src="/assets/infographics/turn-flow-infographic.png"
                  alt="Turn flow infographic: Allocate 6 dice, Resolve Turn, Resolve Move then Claim then Sabotage"
                  className="mt-2 w-full rounded border border-slate-700 object-cover"
                />
                <p className="mt-1">1) Allocate all 6 dice. 2) Press Resolve Turn. 3) Watch Move, Claim, then Sabotage outcomes in Turn Resolution using color affinity (+1 match, -1 off-color, min 1).</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-300">
                <p className="font-semibold text-cyan-200">Board Reading</p>
                <p className="mt-1">Unknown icon/? means unrevealed. Landing reveals that planet’s face and state (Barren, Event, or MacGuffin-rich). Claim dice only test your landed planet: rolls above face count as successes. Faces 5–6 are reward planets; Claimed means that reward was already harvested.</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-300">
                <p className="font-semibold text-cyan-200">Key Rules</p>
                <p className="mt-1">Sabotage targets nearest rival within 2 spaces. Skip turns = sabotage total minus defense (minimum 0), capped at 3. After a forced skip, that player gets temporary skip-immunity until their next playable turn.</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-300">
                <p className="font-semibold text-cyan-200">Pacing + UI Colors</p>
                <p className="mt-1">Galaxy shrinks every 5 turns by 2 planets. Cyan marks active captain; emerald marks winner. Dice colors are affinities: blue favors move, green favors claim, red favors sabotage.</p>
              </div>
            </div>
          </section>
        )}

        <div className={isResolving ? 'pointer-events-none opacity-95' : ''}>
          <GalaxyBoard
            galaxy={state.galaxy}
            players={state.players}
            currentPlayerId={currentPlayer?.id}
            resolving={isResolving}
            playbackStage={playbackStage}
            resolutionSummary={state.latestTurnResolution}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {currentPlayer && !state.winnerId && currentPlayer.skippedTurns === 0 && (
              <DicePool
                dicePool={currentPlayer.dicePool}
                allocation={draftAllocation}
                disabled={currentPlayer.isAI || isResolving}
                onAllocationChange={setDraftAllocation}
                onAllocatePreferred={handleAllocatePreferred}
              />
            )}
            {currentPlayer && !state.winnerId && currentPlayer.skippedTurns > 0 && !currentPlayer.isAI && (
              <section className="rounded-xl border border-amber-400 bg-amber-900/20 p-4 text-amber-100">
                <h2 className="text-lg font-semibold">Turn Skipped</h2>
                <p className="mt-1 text-sm">
                  {currentPlayer.name} must skip this turn. Click Resolve Turn to continue.
                </p>
              </section>
            )}
            <TurnControls
              canSubmit={Boolean(currentPlayer?.skippedTurns && currentPlayer.skippedTurns > 0) || allDiceAllocated(draftAllocation)}
              disabled={Boolean(state.winnerId)}
              isAI={Boolean(currentPlayer?.isAI) && !state.winnerId}
              resolving={isResolving}
              resolvingLabel={resolvingMessage}
              onSubmit={handleEndTurn}
              onReset={() => setDraftAllocation(emptyAllocation())}
            />
          </div>
          <PlayerStatus players={state.players} currentPlayerId={currentPlayer?.id} />
        </div>

        <TurnResolution
          summary={state.latestTurnResolution}
          resolving={isResolving}
          playbackStage={playbackStage}
        />

        <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <h2 className="mb-2 text-lg font-semibold text-slate-100">Turn Log</h2>
          <p className="mb-2 text-xs text-slate-400">Read newest entries at top. Badges show round, turn, acting player, and event type. Each card is one resolved turn. Multiple lines in a card are outcomes from that same turn.</p>
          <TurnLog log={state.log} players={state.players} />
        </section>

        {state.debugEnabled && (
          <section className="rounded-xl border border-fuchsia-500/60 bg-fuchsia-950/10 p-4 text-fuchsia-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Debug Log</h2>
              <button
                type="button"
                className="rounded border border-fuchsia-300 px-2 py-1 text-xs font-semibold"
                onClick={handleDownloadDebugLog}
                disabled={state.debugLog.length === 0}
              >
                Download JSON
              </button>
            </div>
            <p className="mt-1 text-xs text-fuchsia-200">
              Debug logging is enabled. Export this JSON after a game and share it for move-by-move analysis.
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold">Preview latest debug entries</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded border border-fuchsia-500/30 bg-slate-950/80 p-3 text-xs text-fuchsia-100">
{JSON.stringify(state.debugLog.slice(-5), null, 2)}
              </pre>
            </details>
          </section>
        )}
        </div>
      </DndProvider>
      <AppFooter />
    </div>
  )
}

export default App
