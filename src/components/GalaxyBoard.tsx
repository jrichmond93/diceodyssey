import type { Planet, Player, TurnResolutionPlaybackStage, TurnResolutionSnapshot } from '../types'
import { getPlanetState, getPlanetStateVisual, planetStateIcon } from '../utils/planetState'

interface GalaxyBoardProps {
  galaxy: Planet[]
  players: Player[]
  currentPlayerId?: string
  resolving?: boolean
  playbackStage?: TurnResolutionPlaybackStage
  resolutionSummary?: TurnResolutionSnapshot
  prefersReducedMotion?: boolean
}

const laneOffsets = ['sm:-translate-y-1', 'sm:translate-y-1', 'sm:-translate-y-0.5', 'sm:translate-y-1.5']

const getPlayerChipLabel = (name: string): string => {
  const firstToken = name.trim().split(/\s+/)[0] ?? name
  return firstToken.slice(0, 5)
}

const getPlanetHighlightClass = ({
  isMoveTo,
  isMoveFrom,
  isClaimPlanet,
  isCollapseEdge,
}: {
  isMoveTo: boolean
  isMoveFrom: boolean
  isClaimPlanet: boolean
  isCollapseEdge: boolean
}) => {
  if (isMoveTo) {
    return 'ring-cyan-300/80 border-cyan-300'
  }

  if (isMoveFrom) {
    return 'ring-blue-300/80 border-blue-300'
  }

  if (isClaimPlanet) {
    return 'ring-emerald-300/80 border-emerald-300'
  }

  if (isCollapseEdge) {
    return 'ring-amber-300/80 border-amber-300'
  }

  return 'ring-slate-700/70 border-slate-700'
}

const getShipMarkerClass = ({
  playerId,
  sabotageTargetId,
  activeActorId,
  currentPlayerId,
  allowPulse,
}: {
  playerId: string
  sabotageTargetId?: string
  activeActorId?: string
  currentPlayerId?: string
  allowPulse: boolean
}) => {
  if (sabotageTargetId === playerId) {
    return `${allowPulse ? 'animate-pulse ' : ''}bg-red-500 text-red-50 ring-red-200/50`
  }

  if (activeActorId === playerId || currentPlayerId === playerId) {
    return 'bg-cyan-300 text-slate-900 ring-cyan-100/70'
  }

  return 'bg-slate-700 text-slate-100 ring-slate-500/70'
}

export function GalaxyBoard({
  galaxy,
  players,
  currentPlayerId,
  resolving,
  playbackStage = 'idle',
  resolutionSummary,
  prefersReducedMotion = false,
}: GalaxyBoardProps) {
  const moveFromPos = resolving && playbackStage === 'move' ? resolutionSummary?.position.before : undefined
  const moveToPos = resolving && playbackStage === 'move' ? resolutionSummary?.position.after : undefined
  const claimPlanetId = resolving && playbackStage === 'claim' ? resolutionSummary?.claim.landedPlanetId : undefined
  const sabotageTargetId =
    resolving && playbackStage === 'sabotage' ? resolutionSummary?.skips.appliedToTarget?.targetId : undefined
  const activeActorId = resolving ? resolutionSummary?.playerId : undefined
  const postCollapse =
    resolving &&
    playbackStage === 'post' &&
    resolutionSummary &&
    resolutionSummary.galaxy.after < resolutionSummary.galaxy.before
  const collapseEdgePlanetId = postCollapse ? resolutionSummary?.galaxy.after : undefined
  const onStart = players.filter((player) => player.shipPos === 0)
  const allowPulse = !prefersReducedMotion

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
      <div className="mb-3 flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        <h2 className="text-lg font-semibold text-slate-100">Galaxy Board</h2>
        <p className="text-xs text-slate-400 lg:max-w-4xl lg:text-right">Start is position 0. P# is the planet index. Chips show ships on that planet. Unknown/barren/macguffin icons show planet state. Faces 3/4/5/6 are reward planets. Perfect Claim doubles reward when all claim dice succeed (cap +8). Claimed means rewards already harvested.</p>
      </div>
      {resolving && playbackStage !== 'idle' && (
        <p className="mb-3 rounded border border-cyan-400/50 bg-cyan-900/20 px-2 py-1 text-xs text-cyan-100">
          {playbackStage === 'move' && 'Move activity: route and destination highlighted.'}
          {playbackStage === 'claim' && 'Claim activity: landed planet highlighted.'}
          {playbackStage === 'sabotage' && 'Sabotage activity: targeted captain marker highlighted.'}
          {playbackStage === 'post' && 'Post effects: collapse and end-of-turn effects applied.'}
        </p>
      )}
      <div className="relative overflow-hidden rounded-lg border border-slate-800/90 bg-slate-950/70 p-2 sm:p-3">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-14 top-8 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute right-8 top-4 h-52 w-52 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute bottom-[-3.5rem] left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle,_rgba(226,232,240,0.45)_0.7px,_transparent_0.8px)] [background-size:28px_28px]" />
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle,_rgba(186,230,253,0.6)_1px,_transparent_1.1px)] [background-size:42px_42px]" />
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-4 sm:gap-x-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          <div className="relative w-full max-w-[140px] justify-self-center pt-1 text-center">
          <div className={`relative mx-auto h-20 w-20 rounded-full border ring-1 sm:h-24 sm:w-24 lg:h-[6.5rem] lg:w-[6.5rem] xl:h-28 xl:w-28 ${
            moveFromPos === 0 || moveToPos === 0
              ? 'border-cyan-300 text-cyan-100 ring-cyan-300/80'
              : 'border-slate-600 text-cyan-200 ring-slate-600/70'
          }`}>
            <span className="absolute left-1 top-1 rounded border border-cyan-400/40 bg-cyan-900/30 px-1 py-0.5 text-[9px] uppercase tracking-wide text-cyan-100">
              Origin
            </span>
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl leading-none" aria-hidden="true">
              🚀
            </span>
            {onStart.length > 0 && (
              <div className="absolute left-1/2 top-1/2 flex w-[88%] -translate-x-1/2 -translate-y-1/2 flex-wrap justify-center gap-1 pt-6 lg:pt-7 xl:pt-8">
                {onStart.map((player) => (
                  <span
                    key={player.id}
                    className={`inline-flex h-4 min-w-[2.2rem] max-w-[3.5rem] items-center justify-center truncate rounded-full px-1.5 text-[10px] font-semibold leading-none ring-1 ${getShipMarkerClass({
                      playerId: player.id,
                      sabotageTargetId,
                      activeActorId,
                      currentPlayerId,
                      allowPulse,
                    })}`}
                  >
                    {getPlayerChipLabel(player.name)}
                  </span>
                ))}
              </div>
            )}
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-slate-600 bg-slate-900/90 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-200">
              Launch
            </span>
          </div>
          </div>
        {galaxy.map((planet, index) => {
          const pos = index + 1
          const planetState = getPlanetState(planet)
          const visual = getPlanetStateVisual(planetState)
          const onPlanet = players.filter((player) => player.shipPos === pos)
          const isMoveFrom = moveFromPos === pos
          const isMoveTo = moveToPos === pos
          const isClaimPlanet = claimPlanetId === planet.id
          const isCollapseEdge = collapseEdgePlanetId === planet.id

          const planetHighlightClass = getPlanetHighlightClass({
            isMoveTo,
            isMoveFrom,
            isClaimPlanet,
            isCollapseEdge,
          })

          const planetStatusLabel = planet.claimed
            ? 'Claimed'
            : !planet.revealed
              ? ''
              : planetState === 'barren'
                ? 'Barren'
                : 'Unclaimed'

          const offsetClass = laneOffsets[index % laneOffsets.length]
          const motionClass = !prefersReducedMotion && index % 2 === 0 ? 'motion-safe:animate-pulse' : ''

          return (
            <div
              key={planet.id}
              className={`relative w-full max-w-[140px] justify-self-center pt-1 text-center transition-transform ${offsetClass}`}
            >
              <div className={`relative mx-auto h-20 w-20 rounded-full border ring-1 sm:h-24 sm:w-24 lg:h-[6.5rem] lg:w-[6.5rem] xl:h-28 xl:w-28 ${planetHighlightClass} ${visual.shellClass} ${motionClass}`}>
                <img
                  src={planetStateIcon[planetState]}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full rounded-full object-cover"
                />
                <span className="absolute left-1 top-1 rounded border border-slate-600 bg-slate-900/90 px-1 py-0.5 text-[9px] font-semibold text-slate-300 sm:text-[10px]">
                  P{planet.id}
                </span>
                {planet.revealed && (
                  <span className={`absolute right-1 top-1 rounded-full border border-slate-600 bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-bold ${visual.faceClass}`}>
                    {planet.face}
                  </span>
                )}
                {onPlanet.length > 0 && (
                  <div className="absolute left-1/2 top-1/2 flex w-[88%] -translate-x-1/2 -translate-y-1/2 flex-wrap justify-center gap-1">
                    {onPlanet.map((player) => (
                      <span
                        key={player.id}
                        className={`inline-flex h-4 min-w-[2.2rem] max-w-[3.5rem] items-center justify-center truncate rounded-full px-1.5 text-[10px] font-semibold leading-none ring-1 ${getShipMarkerClass({
                          playerId: player.id,
                          sabotageTargetId,
                          activeActorId,
                          currentPlayerId,
                          allowPulse,
                        })}`}
                      >
                        {getPlayerChipLabel(player.name)}
                      </span>
                    ))}
                  </div>
                )}
                {planetStatusLabel.length > 0 && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900/90 px-1.5 py-0.5 text-[9px] text-slate-300">
                    {planetStatusLabel}
                  </span>
                )}
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
