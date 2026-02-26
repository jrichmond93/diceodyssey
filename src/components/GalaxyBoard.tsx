import type { Planet, Player } from '../types'

interface GalaxyBoardProps {
  galaxy: Planet[]
  players: Player[]
  currentPlayerId?: string
}

export function GalaxyBoard({ galaxy, players, currentPlayerId }: GalaxyBoardProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <h2 className="text-lg font-semibold text-slate-100">Galaxy Board</h2>
      <p className="mb-1 text-xs text-slate-400">Start is position 0. P# is the planet index. Chips show ships on that planet.</p>
      <p className="mb-3 text-xs text-slate-400">? is unrevealed. Faces 5/6 are reward planets. Claimed means rewards already harvested.</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        <div className="flex min-w-16 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2 py-3 text-slate-300">
          Start
        </div>
        {galaxy.map((planet, index) => {
          const pos = index + 1
          const onPlanet = players.filter((player) => player.shipPos === pos)

          return (
            <div
              key={planet.id}
              className="relative min-w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-3 text-center"
            >
              <p className="text-xs text-slate-400">P{planet.id}</p>
              <p className="text-lg font-bold text-cyan-200">
                {planet.revealed ? planet.face : '?'}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                {planet.claimed ? 'Claimed' : 'Unclaimed'}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {onPlanet.map((player) => (
                  <span
                    key={player.id}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      currentPlayerId === player.id
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
