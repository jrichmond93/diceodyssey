import type { Player } from '../types'

interface PlayerStatusProps {
  players: Player[]
  currentPlayerId?: string
}

const playerAccentClasses = [
  'border-l-cyan-400',
  'border-l-emerald-400',
  'border-l-amber-400',
  'border-l-fuchsia-400',
]

const playerBadgeClasses = [
  'bg-cyan-900/50 text-cyan-200 border-cyan-700',
  'bg-emerald-900/50 text-emerald-200 border-emerald-700',
  'bg-amber-900/50 text-amber-200 border-amber-700',
  'bg-fuchsia-900/50 text-fuchsia-200 border-fuchsia-700',
]

const macguffinTokenIcon = '/assets/ui/icon-macguffin-token.png'

export function PlayerStatus({ players, currentPlayerId }: PlayerStatusProps) {
  const playerStyles = new Map<string, { accent: string; badge: string }>()
  players.forEach((player, index) => {
    playerStyles.set(player.id, {
      accent: playerAccentClasses[index % playerAccentClasses.length],
      badge: playerBadgeClasses[index % playerBadgeClasses.length],
    })
  })

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <h2 className="mb-3 text-lg font-semibold text-slate-100">Captain Status</h2>
      <p className="mb-3 text-xs text-slate-400">MacGuffins: first to 5 wins. Position: where your ship is. Skips: turns you must pass (max 3 stacked). Defense: subtracts incoming sabotage skips.</p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={`rounded-lg border border-slate-700 bg-slate-900/50 p-3 border-l-4 ${playerStyles.get(player.id)?.accent ?? 'border-l-slate-500'} ${
              currentPlayerId === player.id ? 'ring-1 ring-cyan-300/60' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-100">{player.name}</p>
              <p
                className={`rounded border px-1.5 py-0.5 text-xs uppercase ${
                  playerStyles.get(player.id)?.badge ?? 'border-slate-600 bg-slate-800 text-slate-300'
                }`}
              >
                {player.isAI ? 'AI' : 'Human'}
              </p>
            </div>
            <div className="mt-2 space-y-1 text-sm text-slate-300">
              <p>Position: {player.shipPos}</p>
              <p className="flex items-center gap-1">
                <span>MacGuffins:</span>
                <img
                  src={macguffinTokenIcon}
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 rounded object-cover"
                />
                <span>{player.macGuffins}</span>
              </p>
              <p>Skips: {player.skippedTurns}</p>
              <p>Defense: {player.defense}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
