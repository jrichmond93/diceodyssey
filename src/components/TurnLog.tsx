import type { Player, TurnEvent } from '../types'
import type { Color } from '../types'
import { getDieColorFallbackAssetPath, getDieFaceAssetPath } from '../utils/dieAssets'

interface TurnLogProps {
  log: TurnEvent[]
  players: Player[]
}

interface RenderLogEntry {
  id: string
  turn: number
  round: number
  playerId: string | null
  playerName: string
  kind: 'move' | 'claim' | 'sabotage' | 'system'
  message: string
}

interface RenderTurnGroup {
  id: string
  turn: number
  round: number
  playerId: string | null
  playerName: string
  messages: string[]
  kinds: Set<RenderLogEntry['kind']>
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

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const inferEntryKind = (message: string): RenderLogEntry['kind'] => {
  if (/sabotag/i.test(message)) {
    return 'sabotage'
  }

  if (/claim|macguffin/i.test(message)) {
    return 'claim'
  }

  if (/move|rolled|skip/i.test(message)) {
    return 'move'
  }

  return 'system'
}

const inferActor = (message: string, players: Player[]): Player | null => {
  for (const player of players) {
    const name = escapeRegExp(player.name)
    const directPrefix = new RegExp(`^${name}:`, 'i')
    const verbPrefix = new RegExp(`^${name}\\s`, 'i')

    if (directPrefix.test(message) || verbPrefix.test(message)) {
      return player
    }
  }

  return null
}

const toRenderableLog = (log: TurnEvent[], players: Player[]): RenderLogEntry[] => {
  const playerCount = Math.max(players.length, 1)

  return log.map((entry) => {
    const actor = inferActor(entry.message, players)

    return {
      id: entry.id,
      turn: entry.turn,
      round: Math.floor((entry.turn - 1) / playerCount) + 1,
      playerId: actor?.id ?? null,
      playerName: actor?.name ?? 'System',
      kind: inferEntryKind(entry.message),
      message: entry.message,
    }
  })
}

const groupByRound = (entries: RenderLogEntry[]): Array<{ round: number; entries: RenderTurnGroup[] }> => {
  const turnGroups: RenderTurnGroup[] = []

  entries.forEach((entry) => {
    const existingTurn = turnGroups.find((group) => group.turn === entry.turn)

    if (existingTurn) {
      existingTurn.messages.push(entry.message)
      existingTurn.kinds.add(entry.kind)

      if (!existingTurn.playerId && entry.playerId) {
        existingTurn.playerId = entry.playerId
        existingTurn.playerName = entry.playerName
      }

      return
    }

    turnGroups.push({
      id: entry.id,
      turn: entry.turn,
      round: entry.round,
      playerId: entry.playerId,
      playerName: entry.playerName,
      messages: [entry.message],
      kinds: new Set([entry.kind]),
    })
  })

  const groups: Array<{ round: number; entries: RenderTurnGroup[] }> = []
  turnGroups.forEach((entry) => {
    const existing = groups.find((group) => group.round === entry.round)
    if (existing) {
      existing.entries.push(entry)
      return
    }

    groups.push({ round: entry.round, entries: [entry] })
  })

  return groups
}

interface ActionRollStrip {
  move: number[]
  claim: number[]
  sabotage: number[]
}

const parseRollValues = (value: string): number[] => {
  if (!value || value.trim() === '-') {
    return []
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
}

const parseActionRollStrip = (message: string): ActionRollStrip | null => {
  const match = message.match(/move \[([^\]]*)\].*claim \[([^\]]*)\].*sabotage \[([^\]]*)\]/i)
  if (!match) {
    return null
  }

  return {
    move: parseRollValues(match[1]),
    claim: parseRollValues(match[2]),
    sabotage: parseRollValues(match[3]),
  }
}

const actionRollMeta: Record<keyof ActionRollStrip, { label: string; color: Color; textClass: string }> = {
  move: { label: 'Move', color: 'blue', textClass: 'text-blue-200' },
  claim: { label: 'Claim', color: 'green', textClass: 'text-emerald-200' },
  sabotage: { label: 'Sabotage', color: 'red', textClass: 'text-red-200' },
}

export function TurnLog({ log, players }: TurnLogProps) {
  const playerStyles = new Map<string, { accent: string; badge: string }>()
  players.forEach((player, index) => {
    playerStyles.set(player.id, {
      accent: playerAccentClasses[index % playerAccentClasses.length],
      badge: playerBadgeClasses[index % playerBadgeClasses.length],
    })
  })

  const entries = toRenderableLog(log, players)
  const grouped = groupByRound(entries)

  return (
    <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1 md:max-h-[62vh]">
      {grouped.map((group) => (
        <section key={`round-${group.round}`}>
          <p className="sticky top-0 z-10 mb-2 rounded bg-slate-900/95 px-2 py-1 text-xs font-semibold text-slate-300">
            Round {group.round}
          </p>
          <ul className="space-y-1 text-sm text-slate-200">
            {group.entries.map((entry) => {
              const style = entry.playerId ? playerStyles.get(entry.playerId) : null
              const kindLabel = entry.kinds.size === 1 ? [...entry.kinds][0] : 'turn'
              const actionRollMessage = entry.messages.find((message) => /move \[[^\]]*\]/i.test(message))
              const actionRollStrip = actionRollMessage ? parseActionRollStrip(actionRollMessage) : null

              return (
                <li
                  key={`turn-${entry.turn}-${entry.id}`}
                  className={`rounded border border-slate-700 bg-slate-900/60 p-2 ${
                    style?.accent ?? 'border-l-4 border-l-slate-500'
                  } ${style ? 'border-l-4' : ''}`}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-1 text-[11px]">
                    <span className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-slate-300">
                      R{entry.round}
                    </span>
                    <span className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-slate-300">
                      T{entry.turn}
                    </span>
                    <span
                      className={`rounded border px-1.5 py-0.5 ${
                        style?.badge ?? 'border-slate-600 bg-slate-800 text-slate-300'
                      }`}
                    >
                      {entry.playerName}
                    </span>
                    <span className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 uppercase tracking-wide text-slate-300">
                      {kindLabel}
                    </span>
                  </div>
                  {actionRollStrip && (
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px]">
                      {(Object.keys(actionRollStrip) as Array<keyof ActionRollStrip>).map((action) => {
                        const values = actionRollStrip[action]
                        const meta = actionRollMeta[action]

                        return (
                          <div key={`${entry.id}-${action}`} className="flex items-center gap-1">
                            <span className={`font-semibold uppercase tracking-wide ${meta.textClass}`}>{meta.label}</span>
                            {values.length === 0 ? (
                              <span className="text-slate-400">-</span>
                            ) : (
                              values.map((value, index) => {
                                const faceAssetPath = getDieFaceAssetPath(meta.color, value)
                                const fallbackAssetPath = getDieColorFallbackAssetPath(meta.color)

                                return (
                                  <img
                                    key={`${entry.id}-${action}-${index}-${value}`}
                                    src={faceAssetPath ?? fallbackAssetPath}
                                    alt={`${meta.label} die showing ${value}`}
                                    className="h-4 w-4 rounded object-cover"
                                    loading="lazy"
                                    onError={(event) => {
                                      const target = event.currentTarget
                                      if (target.src.endsWith(fallbackAssetPath)) {
                                        return
                                      }

                                      target.src = fallbackAssetPath
                                    }}
                                  />
                                )
                              })
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="space-y-1">
                    {entry.messages.map((message, index) => (
                      <p key={`${entry.id}-line-${index}`}>
                        <span className="mr-1 text-xs uppercase tracking-wide text-slate-400">
                          {index === 0 ? 'Summary:' : 'Detail:'}
                        </span>
                        {message}
                      </p>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
