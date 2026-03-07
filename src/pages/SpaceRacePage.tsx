import { Link } from 'react-router-dom'
import { GalaxyBoard } from '../components/GalaxyBoard'
import { DicePool } from '../components/DicePool'
import { TurnControls } from '../components/TurnControls'
import { PlayerStatus } from '../components/PlayerStatus'
import { TurnResolution } from '../components/TurnResolution'
import { TurnLog } from '../components/TurnLog'
import { ResolveDiceAnimation } from '../components/ResolveDiceAnimation'
import type {
  Allocation,
  GameState,
  Player,
  TurnResolutionPlaybackStage,
  TurnResolutionSnapshot,
} from '../types'
import { getPlayerAvatarSrc } from '../multiplayer/avatarCatalog'

interface ConfettiParticle {
  left: number
  delay: number
  duration: number
  colorClass: string
}

interface ActiveOpponent {
  id: string
  shortName: string
  slug: string
  fullName?: string
}

interface SeatSummary {
  userId: string
  seat: number
  displayName: string
  connected: boolean
  avatarKey?: string | null
}

interface MatchSnapshotSummary {
  playerSeats: SeatSummary[]
}

interface SpaceRacePageProps {
  authoritativeState: GameState
  currentRound: number
  currentPlayer: Player | undefined
  winnerName: string | undefined
  winnerPlayer: Player | undefined
  postGameNarrative: {
    headline: string
    keyMoments: string[]
    stats: string[]
    whyWinner: string
  }
  turnResolutionRoundRecap: string | undefined
  latestHumanTurnResolution: TurnResolutionSnapshot | undefined
  activeOpponents: ActiveOpponent[]
  helpOpen: boolean
  isOnlineMode: boolean
  isOnlineActivePlayer: boolean
  isOnlineStatusWarning: boolean
  onlineStatusMessage: string | null
  onlineError: string | null
  onlineSessionId: string | null
  onlineSnapshot: MatchSnapshotSummary | null
  onlineLifecycleSubmitting: boolean
  onlineSubmitting: boolean
  playerAvatarKeyByPlayerId: Record<string, string | undefined> | undefined
  draftAllocation: Allocation
  isResolving: boolean
  playbackStage: TurnResolutionPlaybackStage
  resolvingMessage: string
  mode: 'single' | 'hotseat' | 'multiplayer'
  singlePlayerAiTurnGate: boolean
  singlePlayerAutoContinueAiTurns: boolean
  showDebrief: boolean
  showResolveAnimation: boolean
  resolveAnimationVariant: 'rolling' | 'skip'
  showHumanWinCelebration: boolean
  prefersReducedMotion: boolean
  humanWinConfetti: ConfettiParticle[]
  unifiedPlayHybridRematchEnabled: boolean
  onToggleHelp: () => void
  onLeaveOrNewGame: () => void
  onToggleDebrief: () => void
  onPlayAgain: () => void
  onLeaveMatch: () => void
  onResign: () => void
  onAllocatePreferred: () => void
  onAllocationChange: (allocation: Allocation) => void
  onSubmitTurn: () => void
  onResetAllocation: () => void
  onSetAutoPlayAiTurns: (value: boolean) => void
  onContinueAiTurn: () => void
  onDownloadDebugLog: () => void
}

const MACGUFFIN_TOKEN_ICON = '/assets/ui/icon-macguffin-token.png'

export function SpaceRacePage({
  authoritativeState,
  currentRound,
  currentPlayer,
  winnerName,
  winnerPlayer,
  postGameNarrative,
  turnResolutionRoundRecap,
  latestHumanTurnResolution,
  activeOpponents,
  helpOpen,
  isOnlineMode,
  isOnlineActivePlayer,
  isOnlineStatusWarning,
  onlineStatusMessage,
  onlineError,
  onlineSessionId,
  onlineSnapshot,
  onlineLifecycleSubmitting,
  onlineSubmitting,
  playerAvatarKeyByPlayerId,
  draftAllocation,
  isResolving,
  playbackStage,
  resolvingMessage,
  mode,
  singlePlayerAiTurnGate,
  singlePlayerAutoContinueAiTurns,
  showDebrief,
  showResolveAnimation,
  resolveAnimationVariant,
  showHumanWinCelebration,
  prefersReducedMotion,
  humanWinConfetti,
  unifiedPlayHybridRematchEnabled,
  onToggleHelp,
  onLeaveOrNewGame,
  onToggleDebrief,
  onPlayAgain,
  onLeaveMatch,
  onResign,
  onAllocatePreferred,
  onAllocationChange,
  onSubmitTurn,
  onResetAllocation,
  onSetAutoPlayAiTurns,
  onContinueAiTurn,
  onDownloadDebugLog,
}: SpaceRacePageProps) {
  return (
    <>
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
              alt="Dice Odysseys logo"
              className="h-14 w-14 rounded-md border border-slate-700 object-cover"
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-cyan-200">Space Race</h1>
              <p className="text-xs text-slate-400">Dice Odysseys</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 pr-1 text-sm text-slate-300 md:flex-nowrap md:overflow-x-auto md:whitespace-nowrap">
                <span className="shrink-0">Round {currentRound} · Turn {authoritativeState.turn} · Current:</span>
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
                    <Link
                      to="/games/space-race/how-to-play"
                      className="shrink-0 text-xs text-cyan-300 hover:text-cyan-200 md:ml-1"
                    >
                      How to Play
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
              onClick={onToggleHelp}
            >
              {helpOpen ? 'Hide Help & Tips' : 'Show Help & Tips'}
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold leading-tight text-slate-100"
              onClick={onLeaveOrNewGame}
              disabled={onlineLifecycleSubmitting}
            >
              {isOnlineMode ? 'Leave Match' : 'New Game'}
            </button>
          </div>
        </header>

        {(onlineStatusMessage || onlineError || onlineSessionId || (isOnlineMode && onlineSnapshot && !authoritativeState.winnerId)) && (
          <div className="grid gap-3 xl:grid-cols-2 xl:items-start">
            {(onlineStatusMessage || onlineError || onlineSessionId) && (
              <section className="space-y-1 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200 xl:h-full">
                {onlineSessionId && authoritativeState.debugEnabled && <p>Online session: {onlineSessionId}</p>}
                {onlineStatusMessage && (
                  <p
                    className={
                      isOnlineStatusWarning
                        ? 'rounded-md border border-amber-400/70 bg-amber-900/30 px-2 py-1 font-semibold text-amber-100'
                        : 'text-cyan-200'
                    }
                    role="status"
                    aria-live="polite"
                  >
                    {onlineStatusMessage}
                  </p>
                )}
                {onlineError && <p className="text-rose-300">{onlineError}</p>}
                {isOnlineMode && !authoritativeState.winnerId && (
                  <div className="pt-1">
                    <button
                      type="button"
                      className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-100 disabled:opacity-50"
                      onClick={onResign}
                      disabled={onlineLifecycleSubmitting || onlineSubmitting || !isOnlineActivePlayer}
                    >
                      Resign
                    </button>
                  </div>
                )}
              </section>
            )}

            {isOnlineMode && onlineSnapshot && !authoritativeState.winnerId && (
              <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200 xl:h-full">
                <p className="font-semibold text-cyan-200">Match Seats</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {onlineSnapshot.playerSeats.map((seat) => (
                    <li
                      key={`${seat.userId}-${seat.seat}`}
                      className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1"
                    >
                      <img
                        src={getPlayerAvatarSrc(seat.avatarKey ?? undefined)}
                        alt={`${seat.displayName} avatar`}
                        className="h-7 w-7 rounded border border-slate-600 object-cover"
                      />
                      <span>{seat.displayName}</span>
                      <span className="text-xs text-slate-400">— {seat.connected ? 'Connected' : 'Disconnected'}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {authoritativeState.winnerId && (
          <section className="space-y-3 rounded-xl border border-emerald-400 bg-emerald-900/30 p-4 text-emerald-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                Winner: {winnerName} ({authoritativeState.winnerReason === 'race' ? 'Race Victory' : 'Survival Victory'})
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-100"
                  onClick={onToggleDebrief}
                >
                  {showDebrief ? 'Hide Story' : 'Show Story'}
                </button>
                {isOnlineMode && (
                  <>
                    <button
                      type="button"
                      className="rounded border border-cyan-300 px-2 py-1 text-xs font-semibold text-cyan-100 disabled:opacity-50"
                      onClick={onPlayAgain}
                      disabled={onlineLifecycleSubmitting || onlineSubmitting}
                    >
                      Play Again
                    </button>
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-100 disabled:opacity-50"
                      onClick={onLeaveMatch}
                      disabled={onlineLifecycleSubmitting || onlineSubmitting}
                    >
                      Leave Match
                    </button>
                  </>
                )}
              </div>
            </div>

            {isOnlineMode && onlineSnapshot && (
              <div className="rounded-lg border border-emerald-500/40 bg-slate-950/30 p-3 text-xs text-emerald-50">
                <p className="font-semibold text-emerald-200">Between Games</p>
                <p className="mt-1">Choose <span className="font-semibold">Play Again</span> to start a rematch in this same match, or <span className="font-semibold">Leave Match</span> to return home.</p>
                {unifiedPlayHybridRematchEnabled && (
                  <p className="mt-1 text-emerald-200/90">
                    Rematch uses the Hybrid Slot Planner. Human-only seats must be connected before rematch starts.
                  </p>
                )}
                <p className="mt-2 text-emerald-200">Seat readiness:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {onlineSnapshot.playerSeats.map((seat) => (
                    <li key={`${seat.userId}-${seat.seat}`} className="flex items-center gap-2">
                      <img
                        src={getPlayerAvatarSrc(seat.avatarKey ?? undefined)}
                        alt={`${seat.displayName} avatar`}
                        className="h-6 w-6 rounded border border-emerald-400/70 object-cover"
                      />
                      <span>
                        {seat.displayName} — {seat.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {winnerPlayer && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-100">
                <span>Winner MacGuffins:</span>
                <img
                  src={MACGUFFIN_TOKEN_ICON}
                  alt="Glowing emerald MacGuffin token, a crystalline artifact with energy core from Dice Odysseys"
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
                <p className="mt-1">Unknown icon/? means unrevealed. Landing reveals that planet’s face and state (Barren or MacGuffin-rich). Claim dice only test your landed planet: rolls at or above face count as successes. Face 3 awards +1, face 4 awards +2, face 5 awards +3, and face 6 awards +4 MacGuffins. Perfect Claim bonus: if all claim dice succeed, that planet reward is doubled (cap +8). Claimed means that reward was already harvested. If you start on the last planet, Move sends you backward by your move total.</p>
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
            galaxy={authoritativeState.galaxy}
            players={authoritativeState.players}
            currentPlayerId={currentPlayer?.id}
            resolving={isResolving}
            playbackStage={playbackStage}
            resolutionSummary={authoritativeState.latestTurnResolution}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {currentPlayer && !authoritativeState.winnerId && currentPlayer.skippedTurns === 0 && (
              <DicePool
                dicePool={currentPlayer.dicePool}
                allocation={draftAllocation}
                disabled={
                  currentPlayer.isAI || isResolving || (isOnlineMode && !isOnlineActivePlayer)
                }
                showHelpTips={helpOpen}
                onAllocationChange={onAllocationChange}
                onAllocatePreferred={onAllocatePreferred}
              />
            )}
            {currentPlayer && !authoritativeState.winnerId && currentPlayer.skippedTurns > 0 && !currentPlayer.isAI && (
              <section className="rounded-xl border border-amber-400 bg-amber-900/20 p-4 text-amber-100">
                <h2 className="text-lg font-semibold">Turn Skipped</h2>
                <p className="mt-1 text-sm">
                  {currentPlayer.name} must skip this turn. Click Resolve Turn to continue.
                </p>
              </section>
            )}
            <TurnControls
              canSubmit={
                Boolean(currentPlayer?.skippedTurns && currentPlayer.skippedTurns > 0) ||
                draftAllocation.move.length + draftAllocation.claim.length + draftAllocation.sabotage.length === 6
              }
              disabled={
                Boolean(authoritativeState.winnerId) ||
                (isOnlineMode && (!isOnlineActivePlayer || onlineSubmitting))
              }
              isAI={Boolean(currentPlayer?.isAI) && !authoritativeState.winnerId}
              currentAiName={currentPlayer?.isAI ? currentPlayer.name : undefined}
              resolving={isResolving}
              resolvingLabel={resolvingMessage}
              showAiTurnGate={
                !isOnlineMode &&
                mode === 'single' &&
                Boolean(currentPlayer?.isAI) &&
                singlePlayerAiTurnGate &&
                !isResolving &&
                !authoritativeState.winnerId
              }
              showAiAutoPlayToggle={
                !isOnlineMode &&
                mode === 'single' &&
                authoritativeState.started &&
                !authoritativeState.winnerId
              }
              autoPlayAiTurns={singlePlayerAutoContinueAiTurns}
              onAutoPlayAiTurnsChange={onSetAutoPlayAiTurns}
              onContinueAiTurn={onContinueAiTurn}
              onSubmit={onSubmitTurn}
              onReset={onResetAllocation}
            />
          </div>
          <PlayerStatus
            players={authoritativeState.players}
            currentPlayerId={currentPlayer?.id}
            playerAvatarKeyByPlayerId={playerAvatarKeyByPlayerId}
            showHelpTips={helpOpen}
          />
        </div>

        {turnResolutionRoundRecap && (
          <section className="rounded-xl border border-cyan-400/50 bg-cyan-900/20 p-4 text-cyan-50">
            <h2 className="text-lg font-semibold text-cyan-100">Round Recap</h2>
            <p className="mt-2 text-xs leading-relaxed text-cyan-50">{turnResolutionRoundRecap}</p>
          </section>
        )}

        <TurnResolution
          summary={authoritativeState.latestTurnResolution}
          humanSummary={latestHumanTurnResolution}
          resolving={isResolving}
          playbackStage={playbackStage}
        />

        <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="mb-2 flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
            <h2 className="text-lg font-semibold text-slate-100">Turn Log</h2>
            <p className="text-xs text-slate-400 lg:max-w-4xl lg:text-right">Read newest entries at top. Badges show round, turn, acting player, and event type. Each card is one resolved turn. Multiple lines in a card are outcomes from that same turn.</p>
          </div>
          <TurnLog log={authoritativeState.log} players={authoritativeState.players} />
        </section>

        {authoritativeState.debugEnabled && (
          <section className="rounded-xl border border-fuchsia-500/60 bg-fuchsia-950/10 p-4 text-fuchsia-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Debug Log</h2>
              <button
                type="button"
                className="rounded border border-fuchsia-300 px-2 py-1 text-xs font-semibold"
                onClick={onDownloadDebugLog}
                disabled={authoritativeState.debugLog.length === 0}
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
{JSON.stringify(authoritativeState.debugLog.slice(-5), null, 2)}
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
    </>
  )
}
