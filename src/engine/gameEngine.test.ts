import { describe, expect, it } from 'vitest'
import { computeAIAllocation, emptyAllocation, resolveCurrentPlayerTurn, type EngineDependencies } from './gameEngine'
import type { Allocation, Color, GameState, Planet, Player } from '../types'

const DICE_COLORS: Color[] = ['red', 'red', 'blue', 'blue', 'green', 'green']

const createDicePool = (playerId: string) =>
  DICE_COLORS.map((color, index) => ({ id: `${playerId}-die-${index}`, color }))

const createPlayer = (overrides: Partial<Player> & Pick<Player, 'id' | 'name' | 'isAI'>): Player => ({
  id: overrides.id,
  name: overrides.name,
  isAI: overrides.isAI,
  aiCharacterSlug: overrides.aiCharacterSlug,
  shipPos: overrides.shipPos ?? 0,
  macGuffins: overrides.macGuffins ?? 0,
  skippedTurns: overrides.skippedTurns ?? 0,
  skipImmunity: overrides.skipImmunity ?? false,
  defense: overrides.defense ?? 1,
  dicePool: overrides.dicePool ?? createDicePool(overrides.id),
  allocation: overrides.allocation,
})

const createPlanet = (id: number, face = 3, claimed = false): Planet => ({
  id,
  face,
  claimed,
  revealed: false,
})

const createState = (overrides: Partial<GameState> = {}): GameState => ({
  started: true,
  mode: 'single',
  players: overrides.players ?? [],
  currentPlayerIndex: overrides.currentPlayerIndex ?? 0,
  turn: overrides.turn ?? 1,
  galaxy: overrides.galaxy ?? [],
  difficulty: overrides.difficulty ?? 'medium',
  winnerId: overrides.winnerId,
  winnerReason: overrides.winnerReason,
  log: overrides.log ?? [],
  debugEnabled: overrides.debugEnabled ?? true,
  animationEnabled: overrides.animationEnabled ?? false,
  debugLog: overrides.debugLog ?? [],
  turnResolution: overrides.turnResolution ?? { active: false, stage: 'idle', message: '' },
  latestTurnResolution: overrides.latestTurnResolution,
  turnResolutionHistory: overrides.turnResolutionHistory ?? [],
})

const createDeterministicDeps = (rolls: number[], floats: number[] = []): EngineDependencies => {
  const remainingRolls = [...rolls]
  const remainingFloats = [...floats]

  return {
    rng: {
      rollDie: () => remainingRolls.shift() ?? 1,
      nextFloat: () => remainingFloats.shift() ?? 0.99,
    },
    createLogEntryId: () => 'log-id',
  }
}

describe('computeAIAllocation', () => {
  it('keeps at least two dice in move when ship is at start', () => {
    const ai = createPlayer({ id: 'ai-1', name: 'AI 1', isAI: true, shipPos: 0 })
    const rival = createPlayer({ id: 'p-2', name: 'Rival', isAI: false, shipPos: 2 })
    const galaxy = [createPlanet(1), createPlanet(2), createPlanet(3)]

    const allocation = computeAIAllocation(ai, [ai, rival], galaxy, 1, 'medium', {
      rollDie: () => 1,
      nextFloat: () => 0.99,
    })

    expect(allocation.move.length).toBeGreaterThanOrEqual(2)
    const assigned = new Set([...allocation.move, ...allocation.claim, ...allocation.sabotage])
    expect(assigned.size).toBe(ai.dicePool.length)
  })
})

describe('resolveCurrentPlayerTurn', () => {
  it('resolves a deterministic playable turn with movement, claim, and sabotage', () => {
    const current = createPlayer({
      id: 'human',
      name: 'Human',
      isAI: false,
      shipPos: 1,
      allocation: {
        move: ['human-die-2', 'human-die-3'],
        claim: ['human-die-4', 'human-die-5'],
        sabotage: ['human-die-0', 'human-die-1'],
      },
    })

    const rival = createPlayer({
      id: 'ai-1',
      name: 'AI 1',
      isAI: true,
      shipPos: 4,
      skippedTurns: 1,
      defense: 1,
    })

    const state = createState({
      players: [current, rival],
      currentPlayerIndex: 0,
      turn: 1,
      galaxy: [createPlanet(1, 3, true), createPlanet(2, 4), createPlanet(3, 5), createPlanet(4, 6)],
      debugEnabled: true,
    })

    const next = resolveCurrentPlayerTurn(state, createDeterministicDeps([4, 5, 6, 6, 6, 6]))

    expect(next.turn).toBe(2)
    expect(next.players[0].shipPos).toBe(4)
    expect(next.players[0].macGuffins).toBe(8)
    expect(next.players[0].allocation).toBeUndefined()
    expect(next.galaxy[3].claimed).toBe(true)
    expect(next.galaxy[3].revealed).toBe(true)
    expect(next.players[1].skippedTurns).toBe(3)
    expect(next.latestTurnResolution?.claim.successes).toBe(2)
    expect(next.latestTurnResolution?.totals.sabotage).toBe(14)
    expect(next.debugLog).toHaveLength(1)
  })

  it('resolves skipped turn with immunity and no dice resolution', () => {
    const skippedPlayer = createPlayer({
      id: 'human',
      name: 'Human',
      isAI: false,
      skippedTurns: 2,
      shipPos: 3,
      allocation: emptyAllocation(),
    })

    const rival = createPlayer({
      id: 'ai-1',
      name: 'AI 1',
      isAI: true,
      shipPos: 2,
    })

    const state = createState({
      players: [skippedPlayer, rival],
      currentPlayerIndex: 0,
      turn: 4,
      galaxy: [createPlanet(1), createPlanet(2), createPlanet(3), createPlanet(4)],
      debugEnabled: true,
    })

    const next = resolveCurrentPlayerTurn(state, createDeterministicDeps([]))

    expect(next.turn).toBe(5)
    expect(next.players[0].skippedTurns).toBe(1)
    expect(next.players[0].skipImmunity).toBe(true)
    expect(next.latestTurnResolution?.skipped).toBe(true)
    expect(next.latestTurnResolution?.totals.move).toBe(0)
    expect(next.debugLog).toHaveLength(1)
  })

  it('applies deterministic galaxy shrink on shrink interval turns', () => {
    const current = createPlayer({
      id: 'human',
      name: 'Human',
      isAI: false,
      shipPos: 1,
      allocation: {
        move: ['human-die-2', 'human-die-3'],
        claim: ['human-die-4', 'human-die-5'],
        sabotage: ['human-die-0', 'human-die-1'],
      } satisfies Allocation,
    })

    const rival = createPlayer({
      id: 'ai-1',
      name: 'AI 1',
      isAI: true,
      shipPos: 12,
    })

    const galaxy = Array.from({ length: 12 }, (_, index) => createPlanet(index + 1, 3, false))

    const state = createState({
      players: [current, rival],
      currentPlayerIndex: 0,
      turn: 4,
      galaxy,
      debugEnabled: true,
    })

    const next = resolveCurrentPlayerTurn(state, createDeterministicDeps([1, 1, 1, 1, 1, 1]))

    expect(next.turn).toBe(5)
    expect(next.galaxy).toHaveLength(10)
    expect(next.players[1].shipPos).toBeLessThanOrEqual(10)
    expect(next.log.some((entry) => entry.message.includes('Galaxy collapse!'))).toBe(true)
  })
})
