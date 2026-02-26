import type { Player } from '../types'

interface PlayerStatusProps {
  players: Player[]
  currentPlayerId?: string
}

export function PlayerStatus({ players, currentPlayerId }: PlayerStatusProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <h2 className="mb-3 text-lg font-semibold text-slate-100">Captain Status</h2>
      <p className="mb-3 text-xs text-slate-400">MacGuffins: first to 5 wins. Position: where your ship is. Skips: turns you must pass (max 5 stacked). Defense: subtracts incoming sabotage skips.</p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={`rounded-lg border p-3 ${
              currentPlayerId === player.id
                ? 'border-cyan-400 bg-cyan-900/20'
                : 'border-slate-700 bg-slate-900/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-100">{player.name}</p>
              <p className="text-xs uppercase text-slate-400">{player.isAI ? 'AI' : 'Human'}</p>
            </div>
            <div className="mt-2 space-y-1 text-sm text-slate-300">
              <p>Position: {player.shipPos}</p>
              <p>MacGuffins: {player.macGuffins}</p>
              <p>Skips: {player.skippedTurns}</p>
              <p>Defense: {player.defense}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
