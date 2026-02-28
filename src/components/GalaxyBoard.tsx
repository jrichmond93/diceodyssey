import type { Planet, Player, TurnResolutionPlaybackStage, TurnResolutionSnapshot } from '../types'
import { getPlanetState, planetStateIcon } from '../utils/planetState'

interface GalaxyBoardProps {
  galaxy: Planet[]
  players: Player[]
  currentPlayerId?: string
  resolving?: boolean
  playbackStage?: TurnResolutionPlaybackStage
  resolutionSummary?: TurnResolutionSnapshot
}

export function GalaxyBoard({
  galaxy,
  players,
  currentPlayerId,
  resolving,
  playbackStage = 'idle',
  resolutionSummary,
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

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
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
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        <div className={`relative min-h-24 rounded-lg border bg-slate-900 px-2 py-2 text-sm sm:py-3 ${
          moveFromPos === 0 || moveToPos === 0
            ? 'border-cyan-300 text-cyan-100 ring-1 ring-cyan-300/60'
            : 'border-slate-700 text-slate-300'
        }`}>
          <span className="absolute left-1 top-1 rounded border border-cyan-400/40 bg-cyan-900/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-cyan-100">
            Origin
          </span>
          <div className="mt-4 flex flex-col items-center gap-0.5">
            <span className="text-xl leading-none" aria-hidden="true">🚀</span>
            <p className="text-[11px] font-semibold tracking-wide text-cyan-200">Launch</p>
          </div>
          <div className="mt-1 flex flex-wrap justify-center gap-1">
            {onStart.map((player) => (
              <span
                key={player.id}
                className={`rounded px-1 py-0.5 text-[9px] font-semibold sm:px-1.5 sm:text-[10px] ${
                  sabotageTargetId === player.id
                    ? 'animate-pulse bg-red-500 text-red-50'
                    : activeActorId === player.id || currentPlayerId === player.id
                      ? 'bg-cyan-400 text-slate-900'
                      : 'bg-slate-700 text-slate-100'
                }`}
              >
                {player.name.slice(0, 5)}
              </span>
            ))}
          </div>
        </div>
        {galaxy.map((planet, index) => {
          const pos = index + 1
          const planetState = getPlanetState(planet)
          const onPlanet = players.filter((player) => player.shipPos === pos)
          const isMoveFrom = moveFromPos === pos
          const isMoveTo = moveToPos === pos
          const isClaimPlanet = claimPlanetId === planet.id
          const isCollapseEdge = collapseEdgePlanetId === planet.id

          const planetHighlightClass = isMoveTo
            ? 'border-cyan-300 ring-1 ring-cyan-300/70'
            : isMoveFrom
              ? 'border-blue-300 ring-1 ring-blue-300/60'
              : isClaimPlanet
                ? 'border-emerald-300 ring-1 ring-emerald-300/70'
                : isCollapseEdge
                  ? 'border-amber-300 ring-1 ring-amber-300/70'
                  : 'border-slate-700'

          const planetStatusLabel = planet.claimed
            ? 'Claimed'
            : !planet.revealed
              ? ''
              : planetState === 'barren'
                ? 'Barren'
                : 'Unclaimed'

          return (
            <div
              key={planet.id}
              className={`relative min-h-20 rounded-lg border bg-slate-900 px-1.5 py-2 text-center transition-colors sm:px-2 sm:py-3 ${planetHighlightClass}`}
            >
              <p className="absolute left-1 top-1 text-[10px] text-slate-400 sm:text-xs">P{planet.id}</p>
              <img
                src={planetStateIcon[planetState]}
                alt=""
                aria-hidden="true"
                className="mx-auto h-10 w-10 rounded object-cover"
              />
              <p className="text-base font-bold text-cyan-200 sm:text-lg">
                {planet.revealed ? planet.face : '?'}
              </p>
              <p className="text-[9px] uppercase tracking-wide text-slate-400 sm:text-[10px]">
                {planetStatusLabel}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {onPlanet.map((player) => (
                  <span
                    key={player.id}
                    className={`rounded px-1 py-0.5 text-[9px] font-semibold sm:px-1.5 sm:text-[10px] ${
                      sabotageTargetId === player.id
                        ? 'animate-pulse bg-red-500 text-red-50'
                        : activeActorId === player.id || currentPlayerId === player.id
                          ? 'bg-cyan-400 text-slate-900'
                          : 'bg-slate-700 text-slate-100'
                    }`}
                  >
                    {player.name.slice(0, 5)}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
