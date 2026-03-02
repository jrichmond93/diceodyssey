import {
  type ActionType,
  type Allocation,
  type Color,
  type GameAction,
  type GameState,
  type InitGamePayload,
  type Planet,
  type Player,
  type TurnResolutionState,
} from '../types'
import { pickRandomUniqueAICharacters } from '../data/aiCharacters'
import { rollDie } from '../utils/rollDie'
import { resolveCurrentPlayerTurn as resolveCurrentPlayerTurnInEngine } from '../engine/gameEngine'

const DICE_COLORS: Color[] = ['red', 'red', 'blue', 'blue', 'green', 'green']
const INITIAL_GALAXY_SIZE = 12

const idleTurnResolution = (): TurnResolutionState => ({
  active: false,
  stage: 'idle',
  message: '',
})

export const emptyAllocation = (): Allocation => ({
  move: [],
  claim: [],
  sabotage: [],
})

const initialState: GameState = {
  started: false,
  mode: 'single',
  players: [],
  currentPlayerIndex: 0,
  turn: 1,
  galaxy: [],
  difficulty: 'medium',
  winnerId: undefined,
  winnerReason: undefined,
  log: [],
  debugEnabled: false,
  animationEnabled: false,
  debugLog: [],
  turnResolution: idleTurnResolution(),
  latestTurnResolution: undefined,
  turnResolutionHistory: [],
}

const makePlanet = (id: number): Planet => ({
  id,
  face: rollDie(),
  claimed: false,
  revealed: false,
})

const makeDicePool = (playerId: string) =>
  DICE_COLORS.map((color, index) => ({ id: `${playerId}-die-${index}`, color }))

const makePlayer = (id: string, name: string, isAI: boolean, aiCharacterSlug?: string): Player => ({
  id,
  name,
  isAI,
  aiCharacterSlug,
  shipPos: 0,
  macGuffins: 0,
  skippedTurns: 0,
  skipImmunity: false,
  defense: 1,
  dicePool: makeDicePool(id),
  allocation: undefined,
})

const createPlayers = (payload: InitGamePayload): Player[] => {
  if (payload.mode === 'hotseat') {
    return payload.humanNames.map((name, index) => makePlayer(`p${index + 1}`, name, false))
  }

  const humans = [makePlayer('human', payload.humanNames[0] || 'Human', false)]
  const selectedCharacters = pickRandomUniqueAICharacters(payload.aiCount)
  const ais = Array.from({ length: payload.aiCount }, (_, index) => {
    const character = selectedCharacters[index]
    if (!character) {
      return makePlayer(`ai-${index + 1}`, `AI ${index + 1}`, true)
    }

    return makePlayer(`ai-${index + 1}`, character.shortName, true, character.slug)
  })

  return [...humans, ...ais]
}

const addLog = (state: GameState, message: string): GameState => ({
  ...state,
  log: [{ id: crypto.randomUUID(), turn: state.turn, message }, ...state.log].slice(0, 20),
})

const countAllocatedDice = (allocation: Allocation): number =>
  allocation.move.length + allocation.claim.length + allocation.sabotage.length

const isAllocationValid = (player: Player, allocation: Allocation): boolean => {
  const dieById = new Map(player.dicePool.map((die) => [die.id, die]))
  const seen = new Set<string>()

  const actions: ActionType[] = ['move', 'claim', 'sabotage']
  for (const action of actions) {
    for (const dieId of allocation[action]) {
      const die = dieById.get(dieId)
      if (!die || seen.has(dieId)) {
        return false
      }
      seen.add(dieId)
    }
  }

  return seen.size === player.dicePool.length
}

export const gameReducer = (state: GameState = initialState, action: GameAction): GameState => {
  switch (action.type) {
    case 'INIT_GAME': {
      const players = createPlayers(action.payload)
      const galaxy = Array.from({ length: INITIAL_GALAXY_SIZE }, (_, i) => makePlanet(i + 1))

      return {
        ...initialState,
        started: true,
        mode: action.payload.mode,
        players,
        galaxy,
        difficulty: action.payload.difficulty,
        debugEnabled: action.payload.debugEnabled,
        animationEnabled: action.payload.animationEnabled,
        debugLog: [],
        latestTurnResolution: undefined,
        turnResolutionHistory: [],
        log: [
          {
            id: crypto.randomUUID(),
            turn: 1,
            message: `Game started: ${action.payload.mode} mode with ${players.length} player(s).`,
          },
        ],
      }
    }

    case 'ALLOCATE_DICE': {
      if (!state.started || state.winnerId) {
        return state
      }

      const currentPlayer = state.players[state.currentPlayerIndex]
      if (!currentPlayer || currentPlayer.isAI) {
        return state
      }

      if (countAllocatedDice(action.payload) !== currentPlayer.dicePool.length) {
        return addLog(state, `${currentPlayer.name} must allocate all 6 dice.`)
      }

      if (!isAllocationValid(currentPlayer, action.payload)) {
        return addLog(
          state,
          `${currentPlayer.name} has an invalid allocation. Assign each die once across Move/Claim/Sabotage.`,
        )
      }

      const players = state.players.map((player, index) =>
        index === state.currentPlayerIndex ? { ...player, allocation: action.payload } : player,
      )

      return {
        ...state,
        players,
      }
    }

    case 'START_TURN_RESOLUTION': {
      if (!state.started || state.winnerId) {
        return state
      }

      return {
        ...state,
        turnResolution: {
          active: true,
          stage: action.payload?.stage ?? 'resolving',
          message: action.payload?.message ?? 'Resolving turn activity...',
        },
      }
    }

    case 'END_TURN_RESOLUTION': {
      return {
        ...state,
        turnResolution: idleTurnResolution(),
      }
    }

    case 'RESOLVE_TURN': {
      if (!state.started || state.winnerId) {
        return state
      }

      const currentPlayer = state.players[state.currentPlayerIndex]
      if (!currentPlayer) {
        return state
      }

      if (!currentPlayer.isAI && currentPlayer.skippedTurns <= 0 && !currentPlayer.allocation) {
        return addLog(state, `${currentPlayer.name} cannot resolve turn without allocating all dice.`)
      }

      return resolveCurrentPlayerTurnInEngine(state, {
        rng: {
          rollDie,
          nextFloat: Math.random,
        },
        createLogEntryId: () => crypto.randomUUID(),
      })
    }

    case 'NEXT_PLAYER': {
      if (!state.started || state.winnerId) {
        return state
      }

      return {
        ...state,
        currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
      }
    }

    case 'NEW_GAME': {
      return initialState
    }

    default:
      return state
  }
}

export const initialGameState = initialState
