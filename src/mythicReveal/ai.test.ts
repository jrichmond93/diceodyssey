import { describe, expect, it } from 'vitest'
import { chooseMythicRevealAction } from './ai'
import { initialMythicRevealState, mythicRevealReducer } from './reducer'
import type { MythicRevealState } from './types'

const initSingle = (): MythicRevealState =>
  mythicRevealReducer(initialMythicRevealState, {
    type: 'INIT_MYTHIC_REVEAL',
    payload: {
      mode: 'single',
      humanName: 'Joe',
      aiProfile: 'circe',
      forcedImageIds: ['trojan-horse-vision', 'sirens-reef-vision'],
    },
  })

const asAiTurn = (state: MythicRevealState): MythicRevealState => ({
  ...state,
  currentPlayerIndex: 1,
})

describe('chooseMythicRevealAction', () => {
  it('rolls when no pending roll exists', () => {
    const state = asAiTurn(initSingle())
    expect(chooseMythicRevealAction(state)).toEqual({ type: 'ROLL_DICE' })
  })

  it('chooses reveal from available rolled faces', () => {
    const base = asAiTurn(initSingle())
    const state: MythicRevealState = {
      ...base,
      pendingRoll: {
        dice: [1, 2, 2, 3, 4, 6],
        canSabotage: false,
        consumedFaces: [],
      },
      players: [
        base.players[0],
        {
          ...base.players[1],
          board: {
            ...base.players[1].board,
            sectionsRevealed: [1, 2],
          },
        },
      ],
    }

    expect(chooseMythicRevealAction(state)).toEqual({
      type: 'CHOOSE_REVEAL',
      payload: { face: 3 },
    })
  })

  it('circe sabotages when reveal unavailable and sabotage legal', () => {
    const base = asAiTurn(initSingle())
    const state: MythicRevealState = {
      ...base,
      pendingRoll: {
        dice: [1, 1, 2, 2, 3, 3],
        canSabotage: true,
        consumedFaces: [],
      },
      players: [
        {
          ...base.players[0],
          board: {
            ...base.players[0].board,
            sectionsRevealed: [2, 4, 6],
          },
        },
        {
          ...base.players[1],
          board: {
            ...base.players[1].board,
            sectionsRevealed: [1, 2, 3],
          },
        },
      ],
    }

    expect(chooseMythicRevealAction(state)).toEqual({
      type: 'CHOOSE_SABOTAGE',
      payload: { targetFace: 2 },
    })
  })

  it('ends turn when no reveal and sabotage not used', () => {
    const base = asAiTurn(initSingle())
    const state: MythicRevealState = {
      ...base,
      pendingRoll: {
        dice: [1, 1, 2, 2, 3, 3],
        canSabotage: false,
        consumedFaces: [],
      },
      players: [
        base.players[0],
        {
          ...base.players[1],
          board: {
            ...base.players[1].board,
            sectionsRevealed: [1, 2, 3],
          },
        },
      ],
    }

    expect(chooseMythicRevealAction(state)).toEqual({ type: 'END_TURN' })
  })
})
