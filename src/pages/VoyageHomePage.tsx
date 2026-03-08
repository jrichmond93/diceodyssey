import { Link } from 'react-router-dom'
import { useEffect, type SyntheticEvent } from 'react'
import { findAICharacterBySlug, OPPONENT_THUMBNAIL_FALLBACK_SRC } from '../data/aiCharacters'
import { getPlayerAvatarSrc, PLAYER_AVATAR_FALLBACK_SRC } from '../multiplayer/avatarCatalog'
import type { VoyageHomeAiProfile, VoyageHomePlayer, VoyageHomeState } from '../voyageHome/types'
import { getCurrentPlayer, getStandings } from '../voyageHome/selectors'

const AI_PROFILE_TO_CHARACTER_SLUG: Record<VoyageHomeAiProfile, string> = {
  posei: 'posey',
  odys: 'odys',
  poly: 'poly',
}

const SEA_MILESTONES = [
  { mark: 0, name: 'Troy Harbor' },
  { mark: 20, name: 'Siren Rocks' },
  { mark: 40, name: 'Cyclops Isle' },
  { mark: 60, name: 'Scylla Pass' },
  { mark: 80, name: 'Ithaca Beacon' },
]

const SHIP_TOKEN_ACCENTS = [
  {
    token: 'border-cyan-200/90 bg-cyan-400/80 text-cyan-950',
    tile: 'border-cyan-500/60 bg-cyan-500/12',
    value: 'text-cyan-200',
  },
  {
    token: 'border-emerald-200/90 bg-emerald-400/80 text-emerald-950',
    tile: 'border-emerald-500/60 bg-emerald-500/12',
    value: 'text-emerald-200',
  },
  {
    token: 'border-amber-200/90 bg-amber-400/80 text-amber-950',
    tile: 'border-amber-500/60 bg-amber-500/12',
    value: 'text-amber-200',
  },
  {
    token: 'border-rose-200/90 bg-rose-400/80 text-rose-950',
    tile: 'border-rose-500/60 bg-rose-500/12',
    value: 'text-rose-200',
  },
]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const resolveSeaTrackTokenPosition = (bankedLeagues: number, targetLeagues: number, index: number) => {
  const safeTarget = Math.max(1, targetLeagues)
  const progress = clamp(bankedLeagues / safeTarget, 0, 1)
  const x = 4 + progress * 92

  // Approximate the S-track path so token markers follow the same visual route.
  const baseY = 52 - Math.sin(progress * Math.PI * 2.45 + 0.35) * 21 - Math.sin(progress * Math.PI * 4.9) * 3
  const laneOffset = (index % 3 - 1) * 3.2
  const y = clamp(baseY + laneOffset, 12, 88)

  return {
    left: `${x.toFixed(2)}%`,
    top: `${y.toFixed(2)}%`,
  }
}

const withImageFallback = (event: SyntheticEvent<HTMLImageElement>, fallbackSrc: string) => {
  const image = event.currentTarget
  if (image.src.endsWith(fallbackSrc)) {
    return
  }

  image.src = fallbackSrc
}

const resolvePlayerPortrait = (player?: VoyageHomePlayer): { src: string; fallback: string } => {
  if (!player) {
    return {
      src: PLAYER_AVATAR_FALLBACK_SRC,
      fallback: PLAYER_AVATAR_FALLBACK_SRC,
    }
  }

  if (!player.isAI) {
    return {
      src: getPlayerAvatarSrc(player.avatarKey),
      fallback: PLAYER_AVATAR_FALLBACK_SRC,
    }
  }

  const slug = player.aiProfile ? AI_PROFILE_TO_CHARACTER_SLUG[player.aiProfile] : undefined
  const character = slug ? findAICharacterBySlug(slug) : undefined

  return {
    src: character?.thumbnailSrc ?? OPPONENT_THUMBNAIL_FALLBACK_SRC,
    fallback: OPPONENT_THUMBNAIL_FALLBACK_SRC,
  }
}

interface VoyageHomePageProps {
  state: VoyageHomeState
  showWinCelebration: boolean
  prefersReducedMotion: boolean
  winConfetti: Array<{
    left: number
    delay: number
    duration: number
    colorClass: string
  }>
  isAiThinking: boolean
  isRollAnimating: boolean
  showAiTurnGate: boolean
  autoPlayAiTurns: boolean
  onSetAutoPlayAiTurns: (value: boolean) => void
  onContinueAiTurn: () => void
  onRoll: () => void
  onHold: () => void
  onCurse: () => void
  onNewGame: () => void
}

export function VoyageHomePage({
  state,
  showWinCelebration,
  prefersReducedMotion,
  winConfetti,
  isAiThinking,
  isRollAnimating,
  showAiTurnGate,
  autoPlayAiTurns,
  onSetAutoPlayAiTurns,
  onContinueAiTurn,
  onRoll,
  onHold,
  onCurse,
  onNewGame,
}: VoyageHomePageProps) {
  const currentPlayer = getCurrentPlayer(state)
  const standings = getStandings(state)
  const isCurrentAi = Boolean(currentPlayer?.isAI)
  const canAct = state.started && !state.winnerId && !isCurrentAi && !isAiThinking && !isRollAnimating
  const nextPlayer = state.players[(state.currentPlayerIndex + 1) % Math.max(1, state.players.length)]
  const currentTurnTotal = currentPlayer?.turnTotal ?? 0
  const currentBankedLeagues = currentPlayer?.bankedLeagues ?? 0
  const currentPortrait = resolvePlayerPortrait(currentPlayer)
  const playerById = new Map(state.players.map((player) => [player.id, player]))
  const shipAccentByPlayerId = new Map(
    state.players.map((player, index) => [player.id, SHIP_TOKEN_ACCENTS[index % SHIP_TOKEN_ACCENTS.length]]),
  )
  const tokenBadgeByPlayerId = new Map<string, string>()
  let humanSlot = 0
  let aiSlot = 0
  state.players.forEach((player) => {
    if (player.isAI) {
      aiSlot += 1
      tokenBadgeByPlayerId.set(player.id, `A${aiSlot}`)
      return
    }

    humanSlot += 1
    tokenBadgeByPlayerId.set(player.id, `H${humanSlot}`)
  })
  const currentTokenPosition = currentPlayer
    ? resolveSeaTrackTokenPosition(currentPlayer.bankedLeagues, state.targetLeagues, state.currentPlayerIndex)
    : null

  useEffect(() => {
    console.debug('[voyage-home] Control state', {
      started: state.started,
      winnerId: state.winnerId,
      isAiThinking,
      currentPlayerId: currentPlayer?.id,
      currentPlayerName: currentPlayer?.name,
      currentPlayerIsAI: currentPlayer?.isAI,
      currentPlayerTurnTotal: currentPlayer?.turnTotal,
      canAct,
      disableReason: !state.started
        ? 'game_not_started'
        : state.winnerId
          ? 'game_finished'
          : isRollAnimating
            ? 'rolling_animation'
          : isAiThinking
            ? 'ai_thinking'
            : isCurrentAi
              ? 'ai_turn'
              : 'none',
      turn: state.turn,
      round: state.round,
    })
  }, [canAct, currentPlayer, isAiThinking, isCurrentAi, isRollAnimating, state.round, state.started, state.turn, state.winnerId])

  return (
    <>
      {showWinCelebration && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0">
            {!prefersReducedMotion &&
              winConfetti.map((particle, index) => (
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
            Voyage Victory!
          </div>
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/branding/dice-odyssey-logo.png"
              alt="Dice Odysseys logo"
              className="h-14 w-14 rounded-md border border-slate-700 object-cover"
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-cyan-200">Voyage Home</h1>
              <p className="text-xs text-slate-400">Dice Odysseys</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 pr-1 text-sm text-slate-300 md:flex-nowrap md:overflow-x-auto md:whitespace-nowrap">
                <span className="shrink-0">Round {state.round} · Turn {state.turn} · Current:</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded border border-cyan-300/70 bg-cyan-900/40 px-1.5 py-0.5 font-semibold text-cyan-100">
                  <img
                    src={currentPortrait.src}
                    alt={`${currentPlayer?.name ?? 'Current captain'} portrait`}
                    className="h-5 w-5 rounded object-cover"
                    onError={(event) => withImageFallback(event, currentPortrait.fallback)}
                  />
                  <span>{currentPlayer?.name ?? '—'}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1 md:self-end md:pt-0">
            <Link
              to="/games/voyage-home/how-to-play"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold leading-tight text-slate-100"
            >
              How to Play
            </Link>
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold leading-tight text-slate-100"
              onClick={onNewGame}
            >
              Back to Home
            </button>
          </div>
      </header>

      {state.winnerId && (
        <section className="rounded-xl border border-emerald-400 bg-emerald-900/30 p-4 text-emerald-100">
          <p className="font-semibold">
            Winner: {state.players.find((player) => player.id === state.winnerId)?.name ?? 'Captain'}
          </p>
          <p className="mt-1 text-sm text-emerald-200">
            {state.suddenDeath.active
              ? 'Sudden death resolved with a decisive lead.'
              : 'Reached the target and led at round boundary.'}
          </p>
        </section>
      )}

      {state.suddenDeath.active && !state.winnerId && (
        <section className="rounded-xl border border-amber-400/70 bg-amber-900/20 p-3 text-amber-100">
          Sudden death active. Contenders: {state.suddenDeath.contenders.length}
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <article className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Sea Track</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-cyan-900/70 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.15),rgba(2,6,23,0.92))] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Storm Path: Troy to Ithaca</p>
              <div className="relative mt-2 h-28 rounded border border-slate-700 bg-slate-900/60">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 100 40"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                >
                  <defs>
                    <linearGradient id="voyage-track-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(34,211,238,0.22)" />
                      <stop offset="50%" stopColor="rgba(56,189,248,0.5)" />
                      <stop offset="100%" stopColor="rgba(16,185,129,0.35)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 27 C12 4, 26 36, 40 10 C54 -3, 70 37, 84 12 C92 3, 97 7, 100 10"
                    stroke="url(#voyage-track-gradient)"
                    strokeWidth="2.8"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 30 C13 8, 28 39, 42 14 C56 0, 72 39, 86 15 C93 8, 98 10, 100 13"
                    stroke="rgba(125,211,252,0.35)"
                    strokeWidth="1.1"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 24 C11 1, 24 33, 38 7 C52 -6, 68 33, 82 8 C91 1, 97 4, 100 7"
                    stroke="rgba(16,185,129,0.22)"
                    strokeWidth="0.9"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="relative grid h-full grid-cols-5 gap-1 px-1 py-2">
                  {SEA_MILESTONES.map((milestone) => (
                    <div key={milestone.mark} className="flex flex-col items-center justify-between text-center">
                      <div className="h-2 w-2 rounded-full border border-cyan-300 bg-cyan-400/60" />
                      <div className="rounded bg-slate-950/80 px-1.5 py-0.5">
                        <p className="text-[10px] font-semibold text-cyan-100">{milestone.mark}</p>
                        <p className="text-[10px] text-slate-300">{milestone.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-0">
                  {state.players.map((player, index) => {
                    const tokenPosition = resolveSeaTrackTokenPosition(player.bankedLeagues, state.targetLeagues, index)
                    const isCurrentPlayer = player.id === currentPlayer?.id
                    const tokenColor = shipAccentByPlayerId.get(player.id)?.token ?? SHIP_TOKEN_ACCENTS[0].token
                    const tokenBadge = tokenBadgeByPlayerId.get(player.id) ?? `${index + 1}`

                    return (
                      <div
                        key={`sea-token-${player.id}`}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={tokenPosition}
                      >
                        <div
                          className={`flex h-8 min-w-8 items-center justify-center rounded-full border-2 px-1.5 text-sm shadow-lg shadow-slate-950/70 ${tokenColor} ${isCurrentPlayer ? 'ring-2 ring-amber-300/90 ring-offset-1 ring-offset-slate-900 shadow-[0_0_16px_rgba(251,191,36,0.45)] animate-pulse' : ''}`}
                          role="img"
                          aria-label={`${player.name} ship token at ${player.bankedLeagues} leagues (${tokenBadge})`}
                        >
                          <span aria-hidden="true" className="text-[11px] font-bold tracking-tight">{tokenBadge}</span>
                        </div>
                      </div>
                    )
                  })}
                  {currentPlayer && currentTokenPosition && (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-[180%]"
                      style={currentTokenPosition}
                    >
                      <div
                        role="status"
                        aria-label={`${currentPlayer.name} afloat leagues ${currentTurnTotal}`}
                        className="rounded-full border border-amber-300/80 bg-amber-100/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-950 shadow-lg shadow-slate-950/70"
                      >
                        Leagues Afloat: {currentTurnTotal}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {standings.map((entry) => {
                const player = playerById.get(entry.playerId)
                const portrait = resolvePlayerPortrait(player)
                const tileAccent = shipAccentByPlayerId.get(entry.playerId) ?? SHIP_TOKEN_ACCENTS[0]
                const isActiveRow = entry.playerId === currentPlayer?.id

                return (
                  <li
                    key={entry.playerId}
                    className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${tileAccent.tile} ${isActiveRow ? 'border-amber-300/80 shadow-[0_0_14px_rgba(251,191,36,0.3)]' : ''}`}
                  >
                    <span className="inline-flex items-center gap-2 font-semibold text-slate-100">
                      <img
                        src={portrait.src}
                        alt={`${entry.name} portrait`}
                        className={`h-8 w-8 rounded border object-cover ${isActiveRow ? 'border-amber-300 ring-2 ring-amber-300/70 shadow-[0_0_14px_rgba(251,191,36,0.35)]' : 'border-slate-500'}`}
                        onError={(event) => withImageFallback(event, portrait.fallback)}
                      />
                      {entry.name}
                      {entry.playerId === currentPlayer?.id && currentTurnTotal > 0 ? (
                        <span className="ml-2 text-xs font-medium text-cyan-300">(+{currentTurnTotal} unbanked)</span>
                      ) : null}
                    </span>
                    <span className={tileAccent.value}>{entry.bankedLeagues} leagues banked</span>
                  </li>
                )
              })}
            </ul>
          </article>

          <article className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Turn Controls</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {showAiTurnGate && (
                <button
                  type="button"
                  className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
                  onClick={onContinueAiTurn}
                >
                  Continue AI Turn
                </button>
              )}
              <button
                type="button"
                className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                onClick={onRoll}
                disabled={!canAct || showAiTurnGate}
              >
                Roll
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
                onClick={onHold}
                disabled={!canAct || showAiTurnGate || (currentPlayer?.turnTotal ?? 0) <= 0}
              >
                Hold
              </button>
              <button
                type="button"
                className="rounded-md border border-amber-400/80 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-60"
                onClick={onCurse}
                disabled={!canAct || showAiTurnGate}
              >
                Curse Leader
              </button>
              {state.mode === 'single' && state.started && !state.winnerId && (
                <label className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-500 accent-cyan-500"
                    checked={autoPlayAiTurns}
                    onChange={(event) => onSetAutoPlayAiTurns(event.target.checked)}
                  />
                  Auto-play AI turns
                </label>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {isRollAnimating
                ? 'Rolling Dice...'
                : isCurrentAi || isAiThinking
                ? 'AI captain is deciding...'
                : 'You may curse only at the start of your turn and only once per turn.'}
            </p>
            {showAiTurnGate && (
              <p className="mt-1 text-xs text-cyan-200">
                Continue when ready to let {currentPlayer?.name ?? 'the AI'} take this turn.
              </p>
            )}
            {!isCurrentAi && !isAiThinking && (
              <p className="mt-1 text-xs text-slate-400">AI turns begin only after your turn ends (Hold or bust).</p>
            )}
            {!isCurrentAi && !isAiThinking && currentTurnTotal > 0 && (
              <p className="mt-2 text-xs text-cyan-200">
                Unbanked this turn: {currentTurnTotal}. Press Hold to bank progress and pass the helm to {nextPlayer?.name ?? 'the next captain'}.
              </p>
            )}
          </article>

          <article className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Event Log</h2>
            <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto text-xs text-slate-300">
              {state.log.length === 0 && <li>No events yet.</li>}
              {state.log.map((entry) => (
                <li key={entry.id} className="rounded border border-slate-700 bg-slate-900/40 px-2 py-1.5">
                  T{entry.turn}: {entry.message}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Risk HUD</h2>
            <div className="mt-2 space-y-1 text-sm text-slate-200">
              <p>Turn total: {currentTurnTotal}</p>
              <p>Banked: {currentBankedLeagues}</p>
              <p>Target: {state.targetLeagues} leagues</p>
              <p>Pending curse: {currentPlayer?.pendingCurse ? 'Yes' : 'No'}</p>
              {state.lastRoll && (
                <p>
                  Last roll: {state.lastRoll.value}
                  {state.lastRoll.wasCurseStartRoll ? ' (curse start)' : ''}
                  {state.lastRoll.busted ? ' - bust' : ''}
                </p>
              )}
              {!isCurrentAi && currentTurnTotal > 0 && (
                <p className="text-cyan-200">Standings update only after Hold or bust.</p>
              )}
            </div>
          </article>

          <article className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Standings</h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-200">
              {standings.map((entry, index) => {
                const player = playerById.get(entry.playerId)
                const portrait = resolvePlayerPortrait(player)
                const tileAccent = shipAccentByPlayerId.get(entry.playerId) ?? SHIP_TOKEN_ACCENTS[0]
                const isActiveRow = entry.playerId === currentPlayer?.id

                return (
                  <li key={entry.playerId} className={`rounded border px-2 py-1.5 ${tileAccent.tile} ${isActiveRow ? 'border-amber-300/80 shadow-[0_0_14px_rgba(251,191,36,0.3)]' : ''}`}>
                    <span className="inline-flex items-center gap-2">
                      <img
                        src={portrait.src}
                        alt={`${entry.name} portrait`}
                        className={`h-6 w-6 rounded border object-cover ${isActiveRow ? 'border-amber-300 ring-2 ring-amber-300/70 shadow-[0_0_14px_rgba(251,191,36,0.35)]' : 'border-slate-500'}`}
                        onError={(event) => withImageFallback(event, portrait.fallback)}
                      />
                      <span className={tileAccent.value}>{index + 1}. {entry.name} · {entry.bankedLeagues}</span>
                      {isActiveRow ? (
                        <span className="rounded-full border border-amber-300/80 bg-amber-300/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100">
                          Active
                        </span>
                      ) : null}
                    </span>
                  </li>
                )
              })}
            </ul>
          </article>

          <article className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
            <img
              src="/assets/branding/voyage-home.png"
              alt="Voyage Home sea art"
              className="h-80 w-full object-cover"
              loading="lazy"
            />
          </article>
        </aside>
      </section>
      </main>
    </>
  )
}
