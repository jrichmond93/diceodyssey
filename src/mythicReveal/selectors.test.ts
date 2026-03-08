import { describe, expect, it } from 'vitest'
import { getAvailableRevealFaces, isPlayerComplete } from './selectors'
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

describe('mythicReveal selectors', () => {
  it('returns sorted unique reveal faces that are not already revealed', () => {
    const base = initSingle()
    const state: MythicRevealState = {
      ...base,
      pendingRoll: {
        dice: [6, 2, 2, 4, 6, 1],
        canSabotage: true,
      },
      players: [
        {
          ...base.players[0],
          board: {
            ...base.players[0].board,
            sectionsRevealed: [1, 2],
          },
        },
        base.players[1],
      ],
    }

    expect(getAvailableRevealFaces(state)).toEqual([4, 6])
  })

  it('detects completed board at six revealed sections', () => {
    const state = initSingle()
    const player = {
      ...state.players[0],
      board: {
        ...state.players[0].board,
        sectionsRevealed: [1, 2, 3, 4, 5, 6],
      },
    }

    expect(isPlayerComplete(player)).toBe(true)
  })
})
