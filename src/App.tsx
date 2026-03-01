import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AppFooter } from './components/AppFooter'
import { DicePool } from './components/DicePool'
import { GalaxyBoard } from './components/GalaxyBoard'
import { PlayerStatus } from './components/PlayerStatus'
import { TurnResolution } from './components/TurnResolution'
import { TurnLog } from './components/TurnLog'
import { TurnControls } from './components/TurnControls'
import { ResolveDiceAnimation } from './components/ResolveDiceAnimation'
import { AboutPage } from './pages/AboutPage'
import { OpponentBioPage } from './pages/OpponentBioPage'
import { OpponentsPage } from './pages/OpponentsPage'
import { emptyAllocation, gameReducer, initialGameState } from './reducers/gameReducer'
import type { Allocation, Difficulty, GameMode, TurnResolutionPlaybackStage } from './types'
import { findAICharacterBySlug } from './data/aiCharacters'
import { buildPostGameNarrative } from './utils/buildPostGameNarrative'
import { preloadDiceAnimationAssets } from './utils/dieAssets'

const HELP_STORAGE_KEY = 'dice-odyssey-help-open'
const AI_THINK_DELAY_MS = 600
const RESOLVE_STAGE_DELAY_MS = 240
const REDUCED_MOTION_STAGE_DELAY_MS = 80
const REDUCED_MOTION_AI_DELAY_MS = 200
const RESOLVE_ANIMATION_MS = 2000
const MACGUFFIN_TOKEN_ICON = '/assets/ui/icon-macguffin-token.png'

const HUMAN_WIN_CELEBRATION_MS = 4200
const HUMAN_WIN_REDUCED_MOTION_MS = 2400

const humanWinConfetti = [
  { left: 3, delay: 0, duration: 1850, colorClass: 'text-cyan-300' },
  { left: 9, delay: 180, duration: 2050, colorClass: 'text-emerald-300' },
  { left: 15, delay: 60, duration: 1950, colorClass: 'text-fuchsia-300' },
  { left: 21, delay: 320, duration: 2120, colorClass: 'text-cyan-200' },
  { left: 27, delay: 120, duration: 1880, colorClass: 'text-emerald-200' },
  { left: 33, delay: 260, duration: 2200, colorClass: 'text-fuchsia-200' },
  { left: 39, delay: 80, duration: 2000, colorClass: 'text-cyan-300' },
  { left: 45, delay: 210, duration: 1920, colorClass: 'text-emerald-300' },
  { left: 51, delay: 140, duration: 2160, colorClass: 'text-fuchsia-300' },
  { left: 57, delay: 40, duration: 1860, colorClass: 'text-cyan-200' },
  { left: 63, delay: 280, duration: 2060, colorClass: 'text-emerald-200' },
  { left: 69, delay: 100, duration: 1980, colorClass: 'text-fuchsia-200' },
  { left: 75, delay: 360, duration: 2140, colorClass: 'text-cyan-300' },
  { left: 81, delay: 190, duration: 1900, colorClass: 'text-emerald-300' },
  { left: 87, delay: 70, duration: 2080, colorClass: 'text-fuchsia-300' },
  { left: 93, delay: 240, duration: 1960, colorClass: 'text-cyan-200' },
]

type ResolveAnimationVariant = 'rolling' | 'skip'

interface ActiveOpponent {
  id: string
  shortName: string
  slug: string
  fullName?: string
}

const allDiceAllocated = (allocation: Allocation): boolean =>
  allocation.move.length + allocation.claim.length + allocation.sabotage.length === 6

const getNormalizedPathname = (pathname: string): string => {
  if (pathname.length <= 1) {
    return pathname
  }

  return pathname.replace(/\/+$/, '')
}

const getOpponentBioSlug = (pathname: string): string | undefined => {
  const prefix = '/opponents/'

  if (!pathname.startsWith(prefix)) {
    return undefined
  }

  const slug = pathname.slice(prefix.length)
  return slug.length > 0 ? slug : undefined
}

function App() {
  const location = useLocation()
  const pathname = getNormalizedPathname(location.pathname)
  const opponentBioSlug = getOpponentBioSlug(pathname)
  const [state, dispatch] = useReducer(gameReducer, initialGameState)
  const [mode, setMode] = useState<GameMode>('single')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [humanName, setHumanName] = useState('Captain')
  const [aiCount, setAiCount] = useState(2)
  const [hotseatCount, setHotseatCount] = useState(2)
  const [hotseatNames, setHotseatNames] = useState('Captain 1, Captain 2')
  const [debugEnabled, setDebugEnabled] = useState(false)
  const [animationEnabled, setAnimationEnabled] = useState(true)
  const [draftAllocation, setDraftAllocation] = useState<Allocation>(emptyAllocation())
  const [showDebrief, setShowDebrief] = useState(false)
  const [playbackStage, setPlaybackStage] = useState<TurnResolutionPlaybackStage>('idle')
  const [showResolveAnimation, setShowResolveAnimation] = useState(false)
  const [resolveAnimationVariant, setResolveAnimationVariant] = useState<ResolveAnimationVariant>('rolling')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [showHumanWinCelebration, setShowHumanWinCelebration] = useState(false)
  const resolutionTimersRef = useRef<number[]>([])
  const celebrationTimerRef = useRef<number | null>(null)
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
    const timer = window.setTimeout(() => {
      setDraftAllocation(emptyAllocation())
    }, 0)

    return () => window.clearTimeout(timer)
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
    return () => {
      if (celebrationTimerRef.current !== null) {
        window.clearTimeout(celebrationTimerRef.current)
        celebrationTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(HELP_STORAGE_KEY, String(helpOpen))
  }, [helpOpen])

  useEffect(() => {
    if (state.winnerId) {
      const timer = window.setTimeout(() => {
        setShowDebrief(true)
      }, 0)

      return () => window.clearTimeout(timer)
    }
  }, [state.winnerId])

  useEffect(() => {
    if (!state.started || typeof window === 'undefined') {
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [state.started])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    if (!animationEnabled && !state.animationEnabled) {
      return
    }

    void preloadDiceAnimationAssets()
  }, [animationEnabled, state.animationEnabled])

  const winnerName = useMemo(
    () => state.players.find((player) => player.id === state.winnerId)?.name,
    [state.players, state.winnerId],
  )

  const winnerPlayer = useMemo(
    () => state.players.find((player) => player.id === state.winnerId),
    [state.players, state.winnerId],
  )

  useEffect(() => {
    if (celebrationTimerRef.current !== null) {
      window.clearTimeout(celebrationTimerRef.current)
      celebrationTimerRef.current = null
    }

    if (!state.winnerId || !winnerPlayer || winnerPlayer.isAI) {
      setShowHumanWinCelebration(false)
      return
    }

    setShowHumanWinCelebration(true)
    const celebrationDuration = prefersReducedMotion ? HUMAN_WIN_REDUCED_MOTION_MS : HUMAN_WIN_CELEBRATION_MS
    celebrationTimerRef.current = window.setTimeout(() => {
      setShowHumanWinCelebration(false)
      celebrationTimerRef.current = null
    }, celebrationDuration)
  }, [state.winnerId, winnerPlayer, prefersReducedMotion])

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

  const activeOpponents = useMemo(
    () =>
      state.players.reduce<ActiveOpponent[]>((collected, player) => {
        if (!player.isAI || !player.aiCharacterSlug) {
          return collected
        }

        const character = findAICharacterBySlug(player.aiCharacterSlug)
        collected.push({
          id: player.id,
          shortName: player.name,
          slug: player.aiCharacterSlug,
          fullName: character?.fullName,
        })

        return collected
      }, []),
    [state.players],
  )

  const turnResolutionRoundRecap = useMemo(() => {
    if (state.turnResolutionHistory.length === 0) {
      return undefined
    }

    const focusPlayer = state.players.find((player) => !player.isAI) ?? state.players[0]
    const latestFocusTurnIndex =
      focusPlayer
        ? state.turnResolutionHistory.findIndex((snapshot) => snapshot.playerId === focusPlayer.id)
        : -1

    const windowedSnapshots =
      latestFocusTurnIndex >= 0
        ? state.turnResolutionHistory.slice(0, latestFocusTurnIndex + 1)
        : state.turnResolutionHistory.slice(0, 1)

    const chronologicalSnapshots = [...windowedSnapshots].reverse()

    const lines = chronologicalSnapshots.map((snapshot) => {
      if (snapshot.skipped) {
        return `${snapshot.playerName} skipped turn (sabotage effect).`
      }

      const moveDelta = snapshot.position.after - snapshot.position.before
      const movedBy = Math.abs(moveDelta)
      const appliedSkips = snapshot.skips.appliedToTarget?.amount ?? 0
      const targetName = snapshot.skips.appliedToTarget?.targetName

      const claimPart =
        snapshot.totals.gainedMacGuffins > 0
          ? `claim +${snapshot.totals.gainedMacGuffins} MG`
          : snapshot.claim.landedPlanetId
            ? `claim no gain on P${snapshot.claim.landedPlanetId}`
            : 'claim no target'

      const sabotagePart =
        appliedSkips > 0
          ? `sabotage ${targetName ?? 'rival'} +${appliedSkips} skip`
          : snapshot.totals.sabotage > 0
            ? 'sabotage no impact'
            : 'sabotage none'

      const movePart =
        moveDelta > 0
          ? `move forward ${movedBy}`
          : moveDelta < 0
            ? `move backward ${movedBy}`
            : 'move no change'

      return `${snapshot.playerName}: ${movePart} (${snapshot.position.before}→${snapshot.position.after}), ${claimPart}, ${sabotagePart}.`
    })

    return lines.join(' ')
  }, [state.players, state.turnResolutionHistory])

  const latestHumanTurnResolution = useMemo(() => {
    const humanPlayer = state.players.find((player) => !player.isAI)
    if (!humanPlayer) {
      return undefined
    }

    return state.turnResolutionHistory.find((snapshot) => snapshot.playerId === humanPlayer.id)
  }, [state.players, state.turnResolutionHistory])

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

    clearResolutionTimers()

    const continueResolution = () => {
      if (allocation) {
        dispatch({ type: 'ALLOCATE_DICE', payload: allocation })
      }

      dispatch({ type: 'RESOLVE_TURN' })

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
    }

    if (state.animationEnabled) {
      void preloadDiceAnimationAssets()
      setResolveAnimationVariant(isSkippedTurn ? 'skip' : 'rolling')
      setShowResolveAnimation(true)
      resolutionTimersRef.current.push(
        window.setTimeout(() => {
          setShowResolveAnimation(false)
          continueResolution()
        }, RESOLVE_ANIMATION_MS),
      )
      return
    }

    continueResolution()
  }, [
    state.started,
    state.winnerId,
    state.animationEnabled,
    currentPlayer,
    isResolving,
    clearResolutionTimers,
    resolveStageDelay,
  ])

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
          animationEnabled,
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
        animationEnabled,
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
    setShowResolveAnimation(false)
    setResolveAnimationVariant('rolling')
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

  if (pathname === '/about') {
    return (
      <div className="flex min-h-screen flex-col">
        <AboutPage />
        <AppFooter />
      </div>
    )
  }

  if (pathname === '/opponents') {
    return (
      <div className="flex min-h-screen flex-col">
        <OpponentsPage />
        <AppFooter />
      </div>
    )
  }

  if (opponentBioSlug) {
    return (
      <div className="flex min-h-screen flex-col">
        <OpponentBioPage slug={opponentBioSlug} />
        <AppFooter />
      </div>
    )
  }

  if (pathname !== '/') {
    return <Navigate to="/" replace />
  }

  if (!state.started) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center p-6">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/assets/branding/dice-odyssey-logo.png"
                alt="Dice Odyssey logo"
                className="h-20 w-20 rounded-md border border-slate-700 object-cover"
              />
              <div className="flex flex-col">
                <h1 className="text-[2.1rem] font-bold text-cyan-200">Dice Odyssey</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/opponents"
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
              >
                Opponents
              </Link>
              <Link
                to="/about"
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
              >
                About
              </Link>
            </div>
          </div>

          <div className="relative mt-4">
            <img
              src="/assets/branding/hero-banner.png"
              alt="Dice Odyssey hero banner"
              className="h-auto w-full rounded-xl border border-slate-700 object-cover"
            />
            <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-slate-950/70 px-3 py-1 text-center text-base text-slate-100 backdrop-blur-sm">
              A dice-powered race for cosmic MacGuffins.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm text-slate-200">
              Mode
              <select
                className="rounded-md border border-slate-600 bg-slate-900 p-2"
                value={mode}
                onChange={(event) => setMode(event.target.value as GameMode)}
              >
                <option value="single">Single Player</option>
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

          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-2">
            <button
              type="button"
              className="rounded-md bg-cyan-500 px-5 py-2 font-semibold text-slate-950 lg:whitespace-nowrap"
              onClick={handleStart}
            >
              Start Game
            </button>

            <label className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 p-2 text-sm text-slate-200 lg:flex-1">
              <input
                type="checkbox"
                checked={animationEnabled}
                onChange={(event) => setAnimationEnabled(event.target.checked)}
              />
              Show animation
            </label>

            <label className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 p-2 text-sm text-slate-200 lg:flex-1">
              <input
                type="checkbox"
                checked={debugEnabled}
                onChange={(event) => setDebugEnabled(event.target.checked)}
              />
              Enable logging
            </label>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
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
                Reach 7 MacGuffins first for race victory. If the galaxy runs out, survival winner
                is highest MacGuffins, then farthest distance, then fewest pending skips.
              </p>
            </article>
          </div>
          </div>
        </div>
        <AppFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DndProvider backend={HTML5Backend}>
        {showHumanWinCelebration && (
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-0">
              {!prefersReducedMotion &&
                humanWinConfetti.map((particle, index) => (
                  <span
                    key={`${particle.left}-${particle.delay}-${index}`}
                    className={`human-win-confetti ${particle.colorClass}`}
                    style={{
                      left: `${particle.left}%`,
                      animationDelay: `${particle.delay}ms`,
                      animationDuration: `${particle.duration}ms`,
                    }}
                  />
                ))}
            </div>
            <div className="absolute left-1/2 top-24 h-40 w-40 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute left-1/2 top-20 h-52 w-52 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />
            <div className="absolute left-1/2 top-10 -translate-x-1/2 rounded-full border border-cyan-300/60 bg-slate-900/80 px-5 py-2 text-sm font-semibold text-cyan-100 human-win-banner">
              Human Victory!
            </div>
          </div>
        )}
        <div className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 md:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/branding/dice-odyssey-logo.png"
              alt="Dice Odyssey logo"
              className="h-14 w-14 rounded-md border border-slate-700 object-cover"
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-cyan-200">Dice Odyssey</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 pr-1 text-sm text-slate-300 md:flex-nowrap md:overflow-x-auto md:whitespace-nowrap">
                <span className="shrink-0">Round {currentRound} · Turn {state.turn} · Current:</span>
                <span className="shrink-0 rounded border border-cyan-300/70 bg-cyan-900/40 px-1.5 py-0.5 font-semibold text-cyan-100">
                  {currentPlayer?.name ?? '—'}
                </span>
                {activeOpponents.length > 0 && (
                  <>
                    <span className="mx-0.5 hidden shrink-0 text-slate-500 md:inline">·</span>
                    <span className="shrink-0 text-slate-300">Opponents:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeOpponents.map((opponent) => (
                        <Link
                          key={opponent.id}
                          to={`/opponents/${opponent.slug}`}
                          state={{ fromGame: true }}
                          className="inline-flex shrink-0 items-center gap-1 rounded border border-slate-600 bg-slate-900/60 px-1.5 py-0.5 text-xs text-slate-100 hover:border-slate-500"
                        >
                          <span>{opponent.shortName}</span>
                        </Link>
                      ))}
                    </div>
                    <Link
                      to="/opponents"
                      state={{ fromGame: true }}
                      className="shrink-0 text-xs text-cyan-300 hover:text-cyan-200 md:ml-1"
                    >
                      View all
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1 md:self-end md:pt-0">
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold leading-tight text-slate-100"
              onClick={() => setHelpOpen((value) => !value)}
            >
              {helpOpen ? 'Hide Help & Tips' : 'Show Help & Tips'}
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold leading-tight text-slate-100"
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
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-emerald-200">Key Moments</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {postGameNarrative.keyMoments.map((moment) => (
                        <li key={moment}>{moment}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-200">Stats</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {postGameNarrative.stats.map((stat) => (
                        <li key={stat}>{stat}</li>
                      ))}
                    </ul>
                  </div>
                </div>
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
                <p className="mt-1">Unknown icon/? means unrevealed. Landing reveals that planet’s face and state (Barren or MacGuffin-rich). Claim dice only test your landed planet: rolls at or above face count as successes. Face 3 awards +1, face 4 awards +2, face 5 awards +3, and face 6 awards +4 MacGuffins. Perfect Claim bonus: if all claim dice succeed, that planet reward is doubled (cap +8). Claimed means that reward was already harvested. If you start on the last planet and it is already claimed, Move sends you backward by your move total.</p>
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
            prefersReducedMotion={prefersReducedMotion}
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

        {turnResolutionRoundRecap && (
          <section className="rounded-xl border border-cyan-400/50 bg-cyan-900/20 p-4 text-cyan-50">
            <h2 className="text-lg font-semibold text-cyan-100">Round Recap</h2>
            <p className="mt-2 text-xs leading-relaxed text-cyan-50">{turnResolutionRoundRecap}</p>
          </section>
        )}

        <TurnResolution
          summary={state.latestTurnResolution}
          humanSummary={latestHumanTurnResolution}
          resolving={isResolving}
          playbackStage={playbackStage}
        />

        <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="mb-2 flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
            <h2 className="text-lg font-semibold text-slate-100">Turn Log</h2>
            <p className="text-xs text-slate-400 lg:max-w-4xl lg:text-right">Read newest entries at top. Badges show round, turn, acting player, and event type. Each card is one resolved turn. Multiple lines in a card are outcomes from that same turn.</p>
          </div>
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

        <ResolveDiceAnimation
          active={showResolveAnimation}
          playerName={currentPlayer?.name}
          variant={resolveAnimationVariant}
          prefersReducedMotion={prefersReducedMotion}
        />
      </DndProvider>
      <AppFooter />
    </div>
  )
}

export default App
