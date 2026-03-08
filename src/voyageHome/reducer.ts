import { rollDie } from '../utils/rollDie.js'
import { AI_PROFILE_LABEL, DEFAULT_TARGET_LEAGUES, MAX_PLAYERS, MIN_PLAYERS } from './constants.js'
import { getLeaderTargetIndex } from './selectors.js'
import type {
  InitVoyageHomePayload,
  VoyageHomeAction,
  VoyageHomeAiProfile,
  VoyageHomePlayer,
  VoyageHomeState,
} from './types.js'

const initialState: VoyageHomeState = {
  started: false,
  mode: 'single',
  targetLeagues: DEFAULT_TARGET_LEAGUES,
  players: [],
  currentPlayerIndex: 0,
  turn: 1,
  round: 1,
  winnerId: undefined,
  log: [],
  debugEnabled: false,
  suddenDeath: {
    active: false,
    baselineLeagues: undefined,
    contenders: [],
  },
  lastRoll: undefined,
}

const withLog = (state: VoyageHomeState, message: string): VoyageHomeState => ({
  ...state,
  log: [{ id: crypto.randomUUID(), turn: state.turn, message }, ...state.log].slice(0, 30),
})

const aiProfileForIndex = (profiles: VoyageHomeAiProfile[], index: number): VoyageHomeAiProfile =>
  profiles[index] ?? (index % 3 === 0 ? 'posei' : index % 3 === 1 ? 'odys' : 'poly')

const createPlayer = (
  id: string,
  name: string,
  isAI: boolean,
  aiProfile?: VoyageHomeAiProfile,
): VoyageHomePlayer => ({
  id,
  name,
  isAI,
  aiProfile,
  bankedLeagues: 0,
  turnTotal: 0,
  pendingCurse: false,
  usedCurseThisTurn: false,
  hasRolledThisTurn: false,
  curseStartResolvedThisTurn: false,
})

const clampPlayerCount = (count: number): number => Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, count))

const createPlayers = (payload: InitVoyageHomePayload): VoyageHomePlayer[] => {
  if (payload.mode === 'hotseat') {
    const localPlayerCount = clampPlayerCount(payload.humanNames.length || MIN_PLAYERS)
    return Array.from({ length: localPlayerCount }, (_, index) => {
      const name = payload.humanNames[index]?.trim() || `Captain ${index + 1}`
      return createPlayer(`p${index + 1}`, name, false)
    })
  }

  const humanName = payload.humanNames[0]?.trim() || 'Captain'
  const requestedAiCount = clampPlayerCount(1 + (payload.aiProfiles?.length ?? 1)) - 1
  const aiProfiles = payload.aiProfiles ?? ['odys']

  const aiPlayers = Array.from({ length: requestedAiCount }, (_, index) => {
    const profile = aiProfileForIndex(aiProfiles, index)
    const customName = payload.aiNames?.[index]?.trim()
    return createPlayer(`ai-${index + 1}`, customName || AI_PROFILE_LABEL[profile], true, profile)
  })

  return [createPlayer('human', humanName, false), ...aiPlayers]
}

const getNextTurnState = (state: VoyageHomeState): VoyageHomeState => {
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length
  const wrapped = nextIndex === 0

  const resetPlayers = state.players.map((player, index) =>
    index === state.currentPlayerIndex
      ? {
          ...player,
          turnTotal: 0,
          usedCurseThisTurn: false,
          hasRolledThisTurn: false,
          curseStartResolvedThisTurn: false,
        }
      : player,
  )

  return {
    ...state,
    players: resetPlayers,
    currentPlayerIndex: nextIndex,
    turn: state.turn + 1,
    round: wrapped ? state.round + 1 : state.round,
  }
}

const evaluateWinnerAtRoundBoundary = (state: VoyageHomeState): VoyageHomeState => {
  const contenders = state.players.filter((player) => player.bankedLeagues >= state.targetLeagues)
  if (contenders.length === 0) {
    return state
  }

  if (!state.suddenDeath.active) {
    const topLeagues = Math.max(...contenders.map((player) => player.bankedLeagues))
    const topPlayers = contenders.filter((player) => player.bankedLeagues === topLeagues)

    if (topPlayers.length === 1) {
      return {
        ...state,
        winnerId: topPlayers[0].id,
      }
    }

    return withLog(
      {
        ...state,
        suddenDeath: {
          active: true,
          baselineLeagues: topLeagues,
          contenders: topPlayers.map((player) => player.id),
        },
      },
      'Sudden death begins: tied captains race for a decisive lead.',
    )
  }

  const contenderSet = new Set(state.suddenDeath.contenders)
  const contenderPlayers = state.players.filter((player) => contenderSet.has(player.id))
  const topLeagues = Math.max(...contenderPlayers.map((player) => player.bankedLeagues))
  const topPlayers = contenderPlayers.filter((player) => player.bankedLeagues === topLeagues)

  if (topPlayers.length === 1) {
    return {
      ...state,
      winnerId: topPlayers[0].id,
    }
  }

  return {
    ...state,
    suddenDeath: {
      active: true,
      baselineLeagues: topLeagues,
      contenders: topPlayers.map((player) => player.id),
    },
  }
}

const endTurnAndMaybeResolveWinner = (state: VoyageHomeState): VoyageHomeState => {
  const advanced = getNextTurnState(state)
  if (advanced.currentPlayerIndex !== 0) {
    return advanced
  }

  return evaluateWinnerAtRoundBoundary(advanced)
}

export const voyageHomeReducer = (
  state: VoyageHomeState = initialState,
  action: VoyageHomeAction,
): VoyageHomeState => {
  switch (action.type) {
    case 'INIT_VOYAGE_HOME': {
      const players = createPlayers(action.payload)
      const targetLeagues = action.payload.targetLeagues ?? DEFAULT_TARGET_LEAGUES

      return {
        ...initialState,
        started: true,
        mode: action.payload.mode,
        targetLeagues,
        players,
        debugEnabled: Boolean(action.payload.debugEnabled),
        log: [
          {
            id: crypto.randomUUID(),
            turn: 1,
            message: `Voyage Home started with ${players.length} captain(s).`,
          },
        ],
      }
    }

    case 'APPLY_CURSE_TO_LEADER': {
      if (!state.started || state.winnerId) {
        return state
      }

      const actor = state.players[state.currentPlayerIndex]
      if (!actor || actor.usedCurseThisTurn || actor.hasRolledThisTurn || actor.turnTotal > 0) {
        return state
      }

      const targetIndex = getLeaderTargetIndex(state)
      if (targetIndex === null) {
        return withLog(state, `${actor.name} had no eligible leader to curse.`)
      }

      const target = state.players[targetIndex]
      if (target.pendingCurse) {
        return withLog(state, `${target.name} is already cursed.`)
      }

      const updatedPlayers = state.players.map((player, index) => {
        if (index === state.currentPlayerIndex) {
          return {
            ...player,
            usedCurseThisTurn: true,
          }
        }

        if (index === targetIndex) {
          return {
            ...player,
            pendingCurse: true,
          }
        }

        return player
      })

      return withLog(
        {
          ...state,
          players: updatedPlayers,
        },
        `${actor.name} cursed leader ${target.name}.`,
      )
    }

    case 'ROLL_DIE': {
      if (!state.started || state.winnerId) {
        return state
      }

      const current = state.players[state.currentPlayerIndex]
      if (!current) {
        return state
      }

      // Resolve one-time curse check first. A 1 immediately busts the turn.
      if (current.pendingCurse && !current.curseStartResolvedThisTurn) {
        const curseRoll = rollDie()

        const playersAfterCurseRoll = state.players.map((player, index) =>
          index === state.currentPlayerIndex
            ? {
                ...player,
                pendingCurse: false,
                curseStartResolvedThisTurn: true,
                hasRolledThisTurn: true,
              }
            : player,
        )

        const withCurseRoll = {
          ...state,
          players: playersAfterCurseRoll,
          lastRoll: {
            playerId: current.id,
            value: curseRoll,
            wasCurseStartRoll: true,
            busted: curseRoll === 1,
          },
        }

        if (curseRoll === 1) {
          const withBustLog = withLog(withCurseRoll, `${current.name} shipwrecked on the cursed start roll.`)
          return endTurnAndMaybeResolveWinner(withBustLog)
        }

        return withLog(withCurseRoll, `${current.name} survived the cursed start roll (${curseRoll}).`)
      }

      const value = rollDie()
      if (value === 1) {
        const resetPlayers = state.players.map((player, index) =>
          index === state.currentPlayerIndex
            ? {
                ...player,
                turnTotal: 0,
                hasRolledThisTurn: true,
                curseStartResolvedThisTurn: true,
              }
            : player,
        )

        const withBust = withLog(
          {
            ...state,
            players: resetPlayers,
            lastRoll: {
              playerId: current.id,
              value,
              wasCurseStartRoll: false,
              busted: true,
            },
          },
          `${current.name} rolled a 1 and shipwrecked.`,
        )

        return endTurnAndMaybeResolveWinner(withBust)
      }

      const advancedPlayers = state.players.map((player, index) =>
        index === state.currentPlayerIndex
          ? {
              ...player,
              turnTotal: player.turnTotal + value,
              hasRolledThisTurn: true,
              curseStartResolvedThisTurn: true,
            }
          : player,
      )

      return withLog(
        {
          ...state,
          players: advancedPlayers,
          lastRoll: {
            playerId: current.id,
            value,
            wasCurseStartRoll: false,
            busted: false,
          },
        },
        `${current.name} rolled ${value} and pushed to ${current.turnTotal + value} league(s) this turn.`,
      )
    }

    case 'HOLD_TURN_TOTAL': {
      if (!state.started || state.winnerId) {
        return state
      }

      const current = state.players[state.currentPlayerIndex]
      if (!current || current.turnTotal <= 0) {
        return state
      }

      const updatedPlayers = state.players.map((player, index) =>
        index === state.currentPlayerIndex
          ? {
              ...player,
              bankedLeagues: player.bankedLeagues + player.turnTotal,
              turnTotal: 0,
              hasRolledThisTurn: true,
              curseStartResolvedThisTurn: true,
            }
          : player,
      )

      const withHoldLog = withLog(
        {
          ...state,
          players: updatedPlayers,
        },
        `${current.name} held and banked ${current.turnTotal} league(s).`,
      )

      return endTurnAndMaybeResolveWinner(withHoldLog)
    }

    case 'END_TURN': {
      if (!state.started || state.winnerId) {
        return state
      }

      return endTurnAndMaybeResolveWinner(state)
    }

    case 'NEXT_PLAYER': {
      if (!state.started || state.winnerId) {
        return state
      }

      return getNextTurnState(state)
    }

    case 'START_SUDDEN_DEATH': {
      if (!state.started || state.winnerId) {
        return state
      }

      const topLeagues = Math.max(...state.players.map((player) => player.bankedLeagues))
      const contenders = state.players
        .filter((player) => player.bankedLeagues === topLeagues)
        .map((player) => player.id)

      return {
        ...state,
        suddenDeath: {
          active: true,
          baselineLeagues: topLeagues,
          contenders,
        },
      }
    }

    case 'NEW_GAME': {
      return initialState
    }

    default:
      return state
  }
}

export const initialVoyageHomeState = initialState
