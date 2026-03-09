import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMythicImageById } from '../mythicReveal/constants'
import { getAvailableRevealFaces, getAvailableSabotageFaces, getCurrentPlayer } from '../mythicReveal/selectors'
import type { MythicRevealState } from '../mythicReveal/types'

interface MythicRevealPageProps {
  state: MythicRevealState
  showWinCelebration: boolean
  prefersReducedMotion: boolean
  winConfetti: Array<{
    left: number
    delay: number
    duration: number
    colorClass: string
  }>
  isAiThinking: boolean
  sabotageHitTargetFace?: number | null
  sabotageHitPlayerId?: string | null
  sabotageHitToken?: number
  onRoll: () => void
  onReveal: (face: number) => void
  onSabotage: (face: number) => void
  onEndTurn: () => void
  onNewGame: () => void
  onBackToHome: () => void
}

export function MythicRevealPage({
  state,
  showWinCelebration,
  prefersReducedMotion,
  winConfetti,
  isAiThinking,
  sabotageHitTargetFace,
  sabotageHitPlayerId,
  sabotageHitToken,
  onRoll,
  onReveal,
  onSabotage,
  onEndTurn,
  onNewGame,
  onBackToHome,
}: MythicRevealPageProps) {
  const [activeSabotageHit, setActiveSabotageHit] = useState<{
    playerId: string
    face: number
    token: number
  } | null>(null)

  useEffect(() => {
    if (!sabotageHitPlayerId || !sabotageHitTargetFace || sabotageHitToken === undefined) {
      setActiveSabotageHit(null)
      return
    }

    setActiveSabotageHit({
      playerId: sabotageHitPlayerId,
      face: sabotageHitTargetFace,
      token: sabotageHitToken,
    })

    const timer = window.setTimeout(() => {
      setActiveSabotageHit((current) => (current?.token === sabotageHitToken ? null : current))
    }, 500)

    return () => window.clearTimeout(timer)
  }, [sabotageHitPlayerId, sabotageHitTargetFace, sabotageHitToken])

  const currentPlayer = getCurrentPlayer(state)
  const revealFaces = getAvailableRevealFaces(state)
  const sabotageFaces = getAvailableSabotageFaces(state)
  const canAct = state.started && !state.winnerId && !currentPlayer.isAI && !isAiThinking
  const actionPrompt = !state.pendingRoll
    ? 'Roll to generate reveal options.'
    : revealFaces.length > 0
      ? 'Choose one reveal this turn, then end turn.'
      : state.pendingRoll.canSabotage && sabotageFaces.length > 0
        ? 'No reveal available. You may sabotage once, then end turn.'
        : 'No reveal available. End turn to pass control.'
  const winnerPlayer = state.winnerId
    ? state.players.find((player) => player.id === state.winnerId)
    : undefined
  const winnerImageEntry = winnerPlayer ? getMythicImageById(winnerPlayer.board.imageId) : undefined

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 md:p-6">
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
            Prophecy Complete!
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex items-center gap-3">
          <img
            src="/assets/branding/dice-odyssey-logo.png"
            alt="Dice Odysseys logo"
            className="h-14 w-14 rounded-md border border-slate-700 object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold text-cyan-200">Mythic Reveal</h1>
            <p className="text-sm text-slate-300">Reveal all 6 prophecy sections before your rival.</p>
            <p className="mt-1 text-xs text-slate-400">Turn {state.turn} · Current: {currentPlayer.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/games/mythic-reveal/how-to-play"
            state={{ fromGame: true }}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
          >
            How to Play
          </Link>
          <button
            type="button"
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            onClick={onBackToHome}
          >
            Home
          </button>
        </div>
      </header>

      {state.winnerId && (
        <section className="rounded-xl border border-emerald-300/90 bg-emerald-900/45 p-4 text-emerald-50 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_0_24px_rgba(16,185,129,0.18)]">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-lg font-extrabold tracking-wide text-emerald-100 drop-shadow-[0_0_8px_rgba(110,231,183,0.45)]">
                Winner: {winnerPlayer?.name ?? 'Captain'}
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-100">A full prophecy has been revealed.</p>
              {winnerImageEntry?.description && (
                <p className="mt-1 text-sm font-semibold text-emerald-100">Revealed vision: {winnerImageEntry.description}</p>
              )}
            </div>
            <button
              type="button"
              className="rounded border border-emerald-200 bg-emerald-700/35 px-2 py-1 text-xs font-bold text-emerald-50"
              onClick={onNewGame}
            >
              New Game
            </button>
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        {[state.players[0], state.players[1]].map((player) => {
          const isCurrent = player.id === currentPlayer.id
          const revealed = new Set(player.board.sectionsRevealed)
          const boardFullyRevealed = revealed.size >= 6
          const imageEntry = getMythicImageById(player.board.imageId)
          const imageSrc = imageEntry?.fullSrc
          return (
            <article
              key={player.id}
              className={`rounded-xl border bg-slate-950/70 p-4 ${isCurrent ? 'border-cyan-400/80' : 'border-slate-700'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">{player.name}</h2>
                <span className="text-xs text-slate-400">
                  {player.board.sectionsRevealed.length}/6 revealed
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{player.board.imageName || 'Prophecy image'}</p>
              <div className="mt-3 grid h-72 grid-cols-3 grid-rows-2 gap-0 overflow-hidden rounded-lg border border-slate-700 md:h-80">
                {Array.from({ length: 6 }, (_, index) => {
                  const face = index + 1
                  const isRevealed = revealed.has(face)
                  const isSabotageHit =
                    activeSabotageHit?.playerId === player.id && activeSabotageHit.face === face
                  const row = Math.floor(index / 3)
                  const col = index % 3
                  const backgroundStyle = imageSrc
                    ? {
                        backgroundImage: `url(${imageSrc})`,
                        backgroundSize: '300% 200%',
                        backgroundPosition: `${col * 50}% ${row * 100}%`,
                      }
                    : undefined

                  return (
                    <div
                      key={`${player.id}-face-${face}`}
                      className={`relative overflow-hidden ${
                        boardFullyRevealed
                          ? ''
                          : isSabotageHit
                          ? 'shadow-[inset_0_0_0_1px_rgba(248,113,113,0.95),inset_0_0_16px_rgba(239,68,68,0.6)]'
                          : isRevealed
                          ? 'shadow-[inset_0_0_0_1px_rgba(16,185,129,0.7),inset_0_0_14px_rgba(16,185,129,0.35)]'
                          : 'shadow-[inset_0_0_0_1px_rgba(51,65,85,0.75)]'
                      }`}
                      aria-label={`${player.name} section ${face}: ${isRevealed ? 'revealed' : 'hidden'}`}
                    >
                      {imageSrc ? (
                        <div className="absolute inset-0" style={backgroundStyle} aria-hidden="true" />
                      ) : (
                        <div className="absolute inset-0 bg-slate-900/60" aria-hidden="true" />
                      )}

                      <div
                        className="absolute inset-0 bg-slate-950/80 transition-opacity duration-500 ease-out"
                        style={{ opacity: boardFullyRevealed ? 0 : isRevealed ? 0 : isSabotageHit ? 0.2 : 0.82 }}
                        aria-hidden="true"
                      />

                      {isSabotageHit && (
                        <>
                          <div className="pointer-events-none absolute inset-0 bg-rose-500/35 animate-pulse" aria-hidden="true" />
                          <div className="pointer-events-none absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rotate-[12deg] bg-rose-200/90" aria-hidden="true" />
                          <div className="pointer-events-none absolute left-1/3 top-0 h-full w-[1px] rotate-[-14deg] bg-rose-300/70" aria-hidden="true" />
                          <div className="pointer-events-none absolute right-1/3 top-0 h-full w-[1px] rotate-[20deg] bg-rose-300/70" aria-hidden="true" />
                        </>
                      )}

                      <div
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(110,231,183,0.42),rgba(15,23,42,0))] transition-opacity duration-500"
                        style={{ opacity: boardFullyRevealed ? 0 : isRevealed ? 1 : 0 }}
                        aria-hidden="true"
                      />
                    </div>
                  )
                })}
              </div>
            </article>
          )
        })}
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Turn Controls</h2>
        <p className="mt-2 text-xs text-cyan-100">Action required: {actionPrompt}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            onClick={onRoll}
            disabled={!canAct || Boolean(state.pendingRoll)}
          >
            Roll 6 Dice
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
            onClick={onEndTurn}
            disabled={!canAct || !state.pendingRoll}
          >
            End Turn
          </button>
        </div>

        {state.pendingRoll && (
          <div className="mt-3 space-y-3 rounded-md border border-slate-700 bg-slate-900/50 p-3">
            <p className="text-sm text-slate-200">Roll result: {state.pendingRoll.dice.join(', ')}</p>
            <p className="text-xs text-slate-400">
              You can reveal one rolled face not already revealed on your board.
            </p>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Reveal Choices</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {revealFaces.length === 0 && <p className="text-xs text-slate-400">No new reveal options this roll.</p>}
                {revealFaces.map((face) => (
                  <button
                    key={`reveal-${face}`}
                    type="button"
                    className="rounded border border-emerald-400/70 bg-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-100"
                    onClick={() => onReveal(face)}
                    disabled={!canAct}
                  >
                    Reveal {face}
                  </button>
                ))}
              </div>
            </div>

            {state.pendingRoll.canSabotage && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Sabotage Choices</p>
                <p className="mt-1 text-xs text-slate-400">Sabotage hides one rival revealed section. You can sabotage once per turn.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sabotageFaces.length === 0 && (
                    <p className="text-xs text-slate-400">Rival has no revealed sections to sabotage.</p>
                  )}
                  {sabotageFaces.map((face) => (
                    <button
                      key={`sabotage-${face}`}
                      type="button"
                      className="rounded border border-amber-400/70 bg-amber-900/30 px-2 py-1 text-xs font-semibold text-amber-100"
                      onClick={() => onSabotage(face)}
                      disabled={!canAct}
                    >
                      Sabotage {face}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mt-2 text-xs text-slate-400">
          {isAiThinking || currentPlayer.isAI ? 'AI is choosing an action...' : 'Roll, reveal once, optionally sabotage, then end turn.'}
        </p>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Event Log</h2>
        <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto text-xs text-slate-300">
          {state.log.length === 0 && <li>No events yet.</li>}
          {state.log.map((entry) => (
            <li key={entry.id} className="rounded border border-slate-700 bg-slate-900/40 px-2 py-1.5">
              T{entry.turn}: {entry.message}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
