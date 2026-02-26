import type { Player, TurnEvent } from '../types'

interface PostGameNarrativeInput {
  players: Player[]
  log: TurnEvent[]
  winnerId?: string
  winnerReason?: 'race' | 'survival'
  turn: number
}

export interface PostGameNarrative {
  headline: string
  keyMoments: string[]
  stats: string[]
  whyWinner: string
}

const parseSummary = (message: string): { player: string; gained: number } | null => {
  const match = message.match(/^(.+?):.*\+([0-9]+) MacGuffins\.$/)
  if (!match) {
    return null
  }

  return {
    player: match[1],
    gained: Number(match[2]),
  }
}

const parseSabotage = (message: string): { actor: string; target: string; skips: number } | null => {
  const match = message.match(/^(.+?) sabotaged (.+?) for ([0-9]+) skip turn\(s\)/)
  if (!match) {
    return null
  }

  return {
    actor: match[1],
    target: match[2],
    skips: Number(match[3]),
  }
}

export const buildPostGameNarrative = ({
  players,
  log,
  winnerId,
  winnerReason,
  turn,
}: PostGameNarrativeInput): PostGameNarrative => {
  const winner = players.find((player) => player.id === winnerId)
  const chronological = [...log].reverse()

  const totalTurns = Math.max(0, turn - 1)
  const totalRounds = Math.max(1, Math.ceil(totalTurns / Math.max(1, players.length)))

  const firstClaim = chronological
    .map((entry) => ({ entry, parsed: parseSummary(entry.message) }))
    .find((item) => item.parsed && item.parsed.gained > 0)

  const biggestSabotage = chronological
    .map((entry) => ({ entry, parsed: parseSabotage(entry.message) }))
    .filter((item): item is { entry: TurnEvent; parsed: { actor: string; target: string; skips: number } } =>
      Boolean(item.parsed),
    )
    .sort((a, b) => b.parsed.skips - a.parsed.skips)[0]

  const firstCollapse = chronological.find((entry) => entry.message.startsWith('Galaxy collapse!'))

  const sabotageDealt = new Map(players.map((player) => [player.name, 0]))
  chronological.forEach((entry) => {
    const parsed = parseSabotage(entry.message)
    if (!parsed) {
      return
    }

    sabotageDealt.set(parsed.actor, (sabotageDealt.get(parsed.actor) ?? 0) + parsed.skips)
  })

  const sortedByMacGuffins = [...players].sort((a, b) => b.macGuffins - a.macGuffins)
  const runnerUp = sortedByMacGuffins.find((player) => player.id !== winnerId)

  const headline = winner
    ? `${winner.name} wins by ${winnerReason === 'race' ? 'race' : 'survival'} in ${totalTurns} turns.`
    : `Game complete in ${totalTurns} turns.`

  const keyMoments: string[] = []
  if (firstClaim?.parsed) {
    keyMoments.push(
      `First scoring claim: ${firstClaim.parsed.player} gained ${firstClaim.parsed.gained} MacGuffin(s) on turn ${firstClaim.entry.turn}.`,
    )
  }

  if (biggestSabotage) {
    keyMoments.push(
      `Biggest sabotage swing: ${biggestSabotage.parsed.actor} hit ${biggestSabotage.parsed.target} for ${biggestSabotage.parsed.skips} skip turn(s).`,
    )
  }

  if (firstCollapse) {
    keyMoments.push(`Turning point: first galaxy collapse occurred on turn ${firstCollapse.turn}.`)
  }

  if (winner) {
    keyMoments.push(`Final edge: ${winner.name} finished with ${winner.macGuffins} MacGuffin(s).`)
  }

  const stats = [
    `Total turns: ${totalTurns} across ${totalRounds} round(s).`,
    `Final MacGuffins: ${players.map((player) => `${player.name} ${player.macGuffins}`).join(' · ')}.`,
    `Sabotage dealt: ${players
      .map((player) => `${player.name} ${sabotageDealt.get(player.name) ?? 0}`)
      .join(' · ')} skip(s).`,
  ]

  const whyWinner = winner
    ? winnerReason === 'race'
      ? `${winner.name} reached the race threshold first and stayed ahead of ${runnerUp?.name ?? 'the field'}.`
      : `${winner.name} survived the collapse with the highest MacGuffin total, edging out ${runnerUp?.name ?? 'the field'}.`
    : 'No winner could be identified from final state.'

  return {
    headline,
    keyMoments,
    stats,
    whyWinner,
  }
}
