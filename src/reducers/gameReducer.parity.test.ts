import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveCurrentPlayerTurn } from '../engine/gameEngine'
import type { Allocation, Color, GameAction, GameState, Planet, Player } from '../types'

vi.mock('../utils/rollDie', () => ({
  rollDie: vi.fn(),
}))

import { rollDie } from '../utils/rollDie'
import { gameReducer } from './gameReducer'

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

const createQueuedSource = <T>(values: T[], fallback: T) => {
  const queue = [...values]
  return (): T => queue.shift() ?? fallback
}

const runReducerResolveTurn = (
  state: GameState,
  rollQueue: number[],
  randomQueue: number[],
  idQueue: string[],
): GameState => {
  const rollFn = vi.mocked(rollDie)
  rollFn.mockImplementation(createQueuedSource(rollQueue, 1))

  const randomSpy = vi.spyOn(Math, 'random').mockImplementation(createQueuedSource(randomQueue, 0.99))
  const uuidImpl = createQueuedSource(idQueue, '00000000-0000-0000-0000-000000000000')
  const idSpy = vi
    .spyOn(globalThis.crypto, 'randomUUID')
    .mockImplementation(
      uuidImpl as unknown as () => `${string}-${string}-${string}-${string}-${string}`,
    )

  const next = gameReducer(state, { type: 'RESOLVE_TURN' } satisfies GameAction)

  randomSpy.mockRestore()
  idSpy.mockRestore()
  return next
}

describe('gameReducer parity with shared engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('matches engine output for deterministic playable turn', () => {
    const initial = createState({
      players: [
        createPlayer({
          id: 'human',
          name: 'Human',
          isAI: false,
          shipPos: 1,
          allocation: {
            move: ['human-die-2', 'human-die-3'],
            claim: ['human-die-4', 'human-die-5'],
            sabotage: ['human-die-0', 'human-die-1'],
          },
        }),
        createPlayer({
          id: 'ai-1',
          name: 'AI 1',
          isAI: true,
          shipPos: 4,
          skippedTurns: 1,
        }),
      ],
      currentPlayerIndex: 0,
      turn: 1,
      galaxy: [createPlanet(1, 3, true), createPlanet(2, 4), createPlanet(3, 5), createPlanet(4, 6)],
      debugEnabled: true,
    })

    const rollQueue = [4, 5, 6, 6, 6, 6]
    const randomQueue = [0.99, 0.99, 0.99]
    const idQueue = ['log-id-1', 'log-id-2']

    const fromReducer = runReducerResolveTurn(structuredClone(initial), rollQueue, randomQueue, idQueue)
    const fromEngine = resolveCurrentPlayerTurn(structuredClone(initial), {
      rng: {
        rollDie: createQueuedSource(rollQueue, 1),
        nextFloat: createQueuedSource(randomQueue, 0.99),
      },
      createLogEntryId: createQueuedSource(idQueue, '00000000-0000-0000-0000-000000000000'),
    })

    expect(fromReducer).toEqual(fromEngine)
  })

  it('matches engine output for deterministic skipped turn', () => {
    const initial = createState({
      players: [
        createPlayer({
          id: 'human',
          name: 'Human',
          isAI: false,
          skippedTurns: 2,
          shipPos: 3,
          allocation: {
            move: [],
            claim: [],
            sabotage: [],
          } satisfies Allocation,
        }),
        createPlayer({ id: 'ai-1', name: 'AI 1', isAI: true, shipPos: 2 }),
      ],
      currentPlayerIndex: 0,
      turn: 4,
      galaxy: [createPlanet(1), createPlanet(2), createPlanet(3), createPlanet(4)],
      debugEnabled: true,
    })

    const rollQueue: number[] = []
    const randomQueue = [0.99]
    const idQueue = ['log-id-1']

    const fromReducer = runReducerResolveTurn(structuredClone(initial), rollQueue, randomQueue, idQueue)
    const fromEngine = resolveCurrentPlayerTurn(structuredClone(initial), {
      rng: {
        rollDie: createQueuedSource(rollQueue, 1),
        nextFloat: createQueuedSource(randomQueue, 0.99),
      },
      createLogEntryId: createQueuedSource(idQueue, '00000000-0000-0000-0000-000000000000'),
    })

    expect(fromReducer).toEqual(fromEngine)
  })
})
