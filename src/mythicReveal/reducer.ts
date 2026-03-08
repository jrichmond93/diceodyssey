import { rollDie } from '../utils/rollDie'
import {
  AI_PROFILE_LABEL,
  MYTHIC_IMAGE_MANIFEST,
  MYTHIC_REVEAL_DICE_PER_TURN,
  MYTHIC_REVEAL_SECTION_COUNT,
  SABOTAGE_TRIGGER_FACE,
} from './constants'
import { getCurrentPlayer, getOpponentPlayer, isPlayerComplete } from './selectors'
import type {
  InitMythicRevealPayload,
  MythicRevealAction,
  MythicRevealBoard,
  MythicRevealPlayer,
  MythicRevealState,
} from './types'

const initialBoard = (): MythicRevealBoard => ({
  imageId: '',
  imageName: '',
  sectionsRevealed: [],
})

const initialState: MythicRevealState = {
  started: false,
  mode: 'single',
  players: [
    {
      id: 'p1',
      name: 'Captain',
      isAI: false,
      board: initialBoard(),
    },
    {
      id: 'p2',
      name: 'Rival',
      isAI: true,
      aiProfile: 'circe',
      board: initialBoard(),
    },
  ],
  currentPlayerIndex: 0,
  turn: 1,
  winnerId: undefined,
  pendingRoll: undefined,
  log: [],
  debugEnabled: false,
}

const withLog = (state: MythicRevealState, message: string): MythicRevealState => ({
  ...state,
  log: [{ id: crypto.randomUUID(), turn: state.turn, message }, ...state.log].slice(0, 40),
})

const isValidFace = (face: number): boolean => Number.isInteger(face) && face >= 1 && face <= MYTHIC_REVEAL_SECTION_COUNT

const assignBoards = (payload: InitMythicRevealPayload): [MythicRevealBoard, MythicRevealBoard] => {
  if (payload.forcedImageIds) {
    const [leftId, rightId] = payload.forcedImageIds
    const left = MYTHIC_IMAGE_MANIFEST.find((entry) => entry.id === leftId)
    const right = MYTHIC_IMAGE_MANIFEST.find((entry) => entry.id === rightId)

    if (left && right && left.id !== right.id) {
      return [
        { imageId: left.id, imageName: left.name, sectionsRevealed: [] },
        { imageId: right.id, imageName: right.name, sectionsRevealed: [] },
      ]
    }
  }

  const firstIndex = Math.floor(Math.random() * MYTHIC_IMAGE_MANIFEST.length)
  const secondIndex = (firstIndex + 1 + Math.floor(Math.random() * (MYTHIC_IMAGE_MANIFEST.length - 1))) % MYTHIC_IMAGE_MANIFEST.length

  const first = MYTHIC_IMAGE_MANIFEST[firstIndex]
  const second = MYTHIC_IMAGE_MANIFEST[secondIndex]

  return [
    { imageId: first.id, imageName: first.name, sectionsRevealed: [] },
    { imageId: second.id, imageName: second.name, sectionsRevealed: [] },
  ]
}

const createPlayers = (payload: InitMythicRevealPayload): [MythicRevealPlayer, MythicRevealPlayer] => {
  const [leftBoard, rightBoard] = assignBoards(payload)

  if (payload.mode === 'online') {
    return [
      {
        id: 'p1',
        name: payload.humanName?.trim() || 'Captain 1',
        isAI: false,
        board: leftBoard,
      },
      {
        id: 'p2',
        name: payload.rivalName?.trim() || 'Captain 2',
        isAI: false,
        board: rightBoard,
      },
    ]
  }

  const aiProfile = payload.aiProfile ?? 'circe'

  return [
    {
      id: 'human',
      name: payload.humanName?.trim() || 'Captain',
      isAI: false,
      board: leftBoard,
    },
    {
      id: 'ai',
      name: payload.rivalName?.trim() || AI_PROFILE_LABEL[aiProfile],
      isAI: true,
      aiProfile,
      board: rightBoard,
    },
  ]
}

export const mythicRevealReducer = (
  state: MythicRevealState = initialState,
  action: MythicRevealAction,
): MythicRevealState => {
  switch (action.type) {
    case 'INIT_MYTHIC_REVEAL': {
      const players = createPlayers(action.payload)

      return {
        ...initialState,
        started: true,
        mode: action.payload.mode,
        players,
        debugEnabled: Boolean(action.payload.debugEnabled),
        log: [{ id: crypto.randomUUID(), turn: 1, message: 'Mythic Reveal duel begins.' }],
      }
    }

    case 'ROLL_DICE': {
      if (!state.started || state.winnerId || state.pendingRoll) {
        return state
      }

      const dice = action.payload?.dice ?? Array.from({ length: MYTHIC_REVEAL_DICE_PER_TURN }, () => rollDie())
      const normalizedDice = dice.map((value) => (isValidFace(value) ? value : 1))
      const canSabotage = action.payload?.canSabotage ?? normalizedDice.includes(SABOTAGE_TRIGGER_FACE)

      return withLog(
        {
          ...state,
          pendingRoll: {
            dice: normalizedDice,
            canSabotage,
          },
        },
        `${getCurrentPlayer(state).name} rolled ${normalizedDice.join(', ')}.`,
      )
    }

    case 'CHOOSE_REVEAL': {
      if (!state.started || state.winnerId || !state.pendingRoll) {
        return state
      }

      const face = action.payload.face
      if (!isValidFace(face)) {
        return state
      }

      if (!state.pendingRoll.dice.includes(face)) {
        return state
      }

      const current = getCurrentPlayer(state)
      if (current.board.sectionsRevealed.includes(face)) {
        return state
      }

      const nextPlayers: [MythicRevealPlayer, MythicRevealPlayer] = [...state.players] as [MythicRevealPlayer, MythicRevealPlayer]
      const updatedCurrent: MythicRevealPlayer = {
        ...current,
        board: {
          ...current.board,
          sectionsRevealed: [...current.board.sectionsRevealed, face].sort((a, b) => a - b),
        },
      }

      nextPlayers[state.currentPlayerIndex] = updatedCurrent

      const nextState = withLog(
        {
          ...state,
          players: nextPlayers,
        },
        `${updatedCurrent.name} revealed section ${face}.`,
      )

      if (isPlayerComplete(updatedCurrent)) {
        return withLog(
          {
            ...nextState,
            winnerId: updatedCurrent.id,
            pendingRoll: undefined,
          },
          `${updatedCurrent.name} completed the full prophecy.`,
        )
      }

      return nextState
    }

    case 'CHOOSE_SABOTAGE': {
      if (!state.started || state.winnerId || !state.pendingRoll?.canSabotage) {
        return state
      }

      const targetFace = action.payload.targetFace
      if (!isValidFace(targetFace)) {
        return state
      }

      const opponent = getOpponentPlayer(state)
      if (!opponent.board.sectionsRevealed.includes(targetFace)) {
        return state
      }

      const opponentIndex = state.currentPlayerIndex === 0 ? 1 : 0
      const nextPlayers: [MythicRevealPlayer, MythicRevealPlayer] = [...state.players] as [MythicRevealPlayer, MythicRevealPlayer]

      nextPlayers[opponentIndex] = {
        ...opponent,
        board: {
          ...opponent.board,
          sectionsRevealed: opponent.board.sectionsRevealed.filter((face) => face !== targetFace),
        },
      }

      return withLog(
        {
          ...state,
          players: nextPlayers,
          pendingRoll: {
            ...state.pendingRoll,
            canSabotage: false,
          },
        },
        `${getCurrentPlayer(state).name} sabotaged section ${targetFace} from ${opponent.name}.`,
      )
    }

    case 'END_TURN': {
      if (!state.started || state.winnerId || !state.pendingRoll) {
        return state
      }

      const nextPlayerIndex: 0 | 1 = state.currentPlayerIndex === 0 ? 1 : 0
      return {
        ...state,
        currentPlayerIndex: nextPlayerIndex,
        turn: state.turn + 1,
        pendingRoll: undefined,
      }
    }

    case 'NEW_GAME':
      return initialState

    default:
      return state
  }
}

export const initialMythicRevealState = initialState
