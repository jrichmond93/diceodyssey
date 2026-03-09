import { describe, expect, it } from 'vitest'
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

describe('mythicRevealReducer', () => {
  it('starts duel with distinct image boards', () => {
    const state = initSingle()

    expect(state.started).toBe(true)
    expect(state.players[0].board.imageId).toBe('trojan-horse-vision')
    expect(state.players[1].board.imageId).toBe('sirens-reef-vision')
  })

  it('reveals a valid face from roll', () => {
    const withRoll = mythicRevealReducer(initSingle(), {
      type: 'ROLL_DICE',
      payload: { dice: [2, 2, 4, 6, 1, 3], canSabotage: true },
    })

    const next = mythicRevealReducer(withRoll, {
      type: 'CHOOSE_REVEAL',
      payload: { face: 4 },
    })

    expect(next.players[0].board.sectionsRevealed).toEqual([4])
  })

  it('rejects reveal when face was not rolled', () => {
    const withRoll = mythicRevealReducer(initSingle(), {
      type: 'ROLL_DICE',
      payload: { dice: [2, 2, 4, 6, 1, 3], canSabotage: true },
    })

    const next = mythicRevealReducer(withRoll, {
      type: 'CHOOSE_REVEAL',
      payload: { face: 5 },
    })

    expect(next.players[0].board.sectionsRevealed).toEqual([])
  })

  it('consumes sabotage and re-hides rival section', () => {
    const base = initSingle()
    const seeded: MythicRevealState = {
      ...base,
      players: [
        base.players[0],
        {
          ...base.players[1],
          board: {
            ...base.players[1].board,
            sectionsRevealed: [2, 5],
          },
        },
      ],
    }

    const withRoll = mythicRevealReducer(seeded, {
      type: 'ROLL_DICE',
      payload: { dice: [1, 1, 2, 2, 3, 3], canSabotage: true },
    })

    const next = mythicRevealReducer(withRoll, {
      type: 'CHOOSE_SABOTAGE',
      payload: { targetFace: 2 },
    })

    expect(next.players[1].board.sectionsRevealed).toEqual([5])
    expect(next.pendingRoll?.canSabotage).toBe(false)
  })

  it('rejects sabotage when target face was not rolled this turn', () => {
    const base = initSingle()
    const seeded: MythicRevealState = {
      ...base,
      players: [
        base.players[0],
        {
          ...base.players[1],
          board: {
            ...base.players[1].board,
            sectionsRevealed: [2, 5],
          },
        },
      ],
    }

    const withRoll = mythicRevealReducer(seeded, {
      type: 'ROLL_DICE',
      payload: { dice: [1, 1, 2, 2, 3, 3], canSabotage: true },
    })

    const next = mythicRevealReducer(withRoll, {
      type: 'CHOOSE_SABOTAGE',
      payload: { targetFace: 5 },
    })

    expect(next.players[1].board.sectionsRevealed).toEqual([2, 5])
    expect(next.pendingRoll?.canSabotage).toBe(true)
  })

  it('removes revealed face from sabotage eligibility in same turn', () => {
    const base = initSingle()
    const seeded: MythicRevealState = {
      ...base,
      players: [
        {
          ...base.players[0],
          board: {
            ...base.players[0].board,
            sectionsRevealed: [],
          },
        },
        {
          ...base.players[1],
          board: {
            ...base.players[1].board,
            sectionsRevealed: [2, 5],
          },
        },
      ],
    }

    const withRoll = mythicRevealReducer(seeded, {
      type: 'ROLL_DICE',
      payload: { dice: [1, 2, 2, 5, 6, 6], canSabotage: true },
    })

    const afterReveal = mythicRevealReducer(withRoll, {
      type: 'CHOOSE_REVEAL',
      payload: { face: 2 },
    })

    const afterSabotageAttempt = mythicRevealReducer(afterReveal, {
      type: 'CHOOSE_SABOTAGE',
      payload: { targetFace: 2 },
    })

    expect(afterSabotageAttempt.players[1].board.sectionsRevealed).toEqual([2, 5])
    expect(afterSabotageAttempt.pendingRoll?.canSabotage).toBe(true)
  })

  it('declares winner when sixth section is revealed', () => {
    const base = initSingle()
    const nearWin: MythicRevealState = {
      ...base,
      players: [
        {
          ...base.players[0],
          board: {
            ...base.players[0].board,
            sectionsRevealed: [1, 2, 3, 4, 5],
          },
        },
        base.players[1],
      ],
    }

    const withRoll = mythicRevealReducer(nearWin, {
      type: 'ROLL_DICE',
      payload: { dice: [6, 6, 2, 2, 3, 1], canSabotage: true },
    })

    const next = mythicRevealReducer(withRoll, {
      type: 'CHOOSE_REVEAL',
      payload: { face: 6 },
    })

    expect(next.winnerId).toBe(nearWin.players[0].id)
    expect(next.pendingRoll).toBeUndefined()
  })
})
