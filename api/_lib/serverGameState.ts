import { randomInt } from 'node:crypto'
import type { Allocation, Color, GameState, Planet, Player } from '../../src/types.js'

const DICE_COLORS: Color[] = ['red', 'red', 'blue', 'blue', 'green', 'green']
const INITIAL_GALAXY_SIZE = 12

const makeDicePool = (playerId: string) =>
  DICE_COLORS.map((color, index) => ({ id: `${playerId}-die-${index}`, color }))

const makePlayer = (id: string, name: string): Player => ({
  id,
  name,
  isAI: false,
  shipPos: 0,
  macGuffins: 0,
  skippedTurns: 0,
  skipImmunity: false,
  defense: 1,
  dicePool: makeDicePool(id),
  allocation: undefined,
})

interface HybridSeatPlayerConfig {
  name: string
  isAI: boolean
}

const makePlanet = (id: number): Planet => ({
  id,
  face: randomInt(1, 7),
  claimed: false,
  revealed: false,
})

export const createHotseatGameState = (humanNames: string[]): GameState => {
  const players = humanNames.map((name, index) => makePlayer(`p${index + 1}`, name))

  return {
    started: true,
    mode: 'hotseat',
    players,
    currentPlayerIndex: 0,
    turn: 1,
    galaxy: Array.from({ length: INITIAL_GALAXY_SIZE }, (_, i) => makePlanet(i + 1)),
    difficulty: 'medium',
    winnerId: undefined,
    winnerReason: undefined,
    log: [
      {
        id: crypto.randomUUID(),
        turn: 1,
        message: `Game started: hotseat mode with ${players.length} player(s).`,
      },
    ],
    debugEnabled: false,
    animationEnabled: false,
    debugLog: [],
    turnResolution: {
      active: false,
      stage: 'idle',
      message: '',
    },
    latestTurnResolution: undefined,
    turnResolutionHistory: [],
  }
}

export const createHybridGameState = (seatPlayers: HybridSeatPlayerConfig[]): GameState => {
  const players = seatPlayers.map((seatPlayer, index) => {
    const base = makePlayer(`p${index + 1}`, seatPlayer.name)
    return {
      ...base,
      isAI: seatPlayer.isAI,
    }
  })

  return {
    started: true,
    mode: 'hotseat',
    players,
    currentPlayerIndex: 0,
    turn: 1,
    galaxy: Array.from({ length: INITIAL_GALAXY_SIZE }, (_, i) => makePlanet(i + 1)),
    difficulty: 'medium',
    winnerId: undefined,
    winnerReason: undefined,
    log: [
      {
        id: crypto.randomUUID(),
        turn: 1,
        message: `Game started: hybrid rematch with ${players.length} seat(s).`,
      },
    ],
    debugEnabled: false,
    animationEnabled: false,
    debugLog: [],
    turnResolution: {
      active: false,
      stage: 'idle',
      message: '',
    },
    latestTurnResolution: undefined,
    turnResolutionHistory: [],
  }
}

const countAllocatedDice = (allocation: Allocation): number =>
  allocation.move.length + allocation.claim.length + allocation.sabotage.length

export const applyAllocationToCurrentPlayer = (
  state: GameState,
  allocation: Allocation,
): GameState | null => {
  const currentPlayer = state.players[state.currentPlayerIndex]
  if (!currentPlayer) {
    return null
  }

  if (countAllocatedDice(allocation) !== currentPlayer.dicePool.length) {
    return null
  }

  const dieById = new Map(currentPlayer.dicePool.map((die) => [die.id, die]))
  const seen = new Set<string>()

  const actions: Array<keyof Allocation> = ['move', 'claim', 'sabotage']
  for (const action of actions) {
    for (const dieId of allocation[action]) {
      const die = dieById.get(dieId)
      if (!die || seen.has(dieId)) {
        return null
      }
      seen.add(dieId)
    }
  }

  if (seen.size !== currentPlayer.dicePool.length) {
    return null
  }

  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.currentPlayerIndex ? { ...player, allocation } : player,
    ),
  }
}

export const advanceToNextPlayer = (state: GameState): GameState => ({
  ...state,
  currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
})