import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rollDie } from '../utils/rollDie'
import { initialVoyageHomeState, voyageHomeReducer } from './reducer'
import type { VoyageHomeAction, VoyageHomeState } from './types'

vi.mock('../utils/rollDie', () => ({
  rollDie: vi.fn(),
}))

const initSingle = (aiProfiles: Array<'posei' | 'odys' | 'poly'> = ['odys']): VoyageHomeState =>
  voyageHomeReducer(initialVoyageHomeState, {
    type: 'INIT_VOYAGE_HOME',
    payload: {
      mode: 'single',
      humanNames: ['Joe'],
      aiProfiles,
      targetLeagues: 100,
      debugEnabled: true,
    },
  })

const apply = (state: VoyageHomeState, action: VoyageHomeAction): VoyageHomeState =>
  voyageHomeReducer(state, action)

const mockedRollDie = vi.mocked(rollDie)

describe('voyageHomeReducer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('roll adds 2-6 to turn total', () => {
    mockedRollDie.mockReturnValueOnce(5)

    const state = initSingle()
    const next = apply(state, { type: 'ROLL_DIE' })

    expect(next.players[next.currentPlayerIndex].turnTotal).toBe(5)
    expect(next.players[next.currentPlayerIndex].hasRolledThisTurn).toBe(true)
  })

  it('rolling 1 shipwrecks and ends turn', () => {
    mockedRollDie.mockReturnValueOnce(1)

    const state = initSingle()
    const next = apply(state, { type: 'ROLL_DIE' })

    expect(next.currentPlayerIndex).toBe(1)
    expect(next.players[0].turnTotal).toBe(0)
    expect(next.turn).toBe(2)
  })

  it('hold banks leagues and ends turn', () => {
    mockedRollDie.mockReturnValueOnce(4)

    const state = apply(initSingle(), { type: 'ROLL_DIE' })
    const next = apply(state, { type: 'HOLD_TURN_TOTAL' })

    expect(next.players[0].bankedLeagues).toBe(4)
    expect(next.currentPlayerIndex).toBe(1)
    expect(next.players[0].turnTotal).toBe(0)
  })

  it('curse targets leader only, once per turn, with no stacking', () => {
    let state = initSingle(['posei'])

    // Make AI the leader first.
    state = {
      ...state,
      players: state.players.map((player, index) =>
        index === 1 ? { ...player, bankedLeagues: 12 } : player,
      ),
    }

    const cursed = apply(state, { type: 'APPLY_CURSE_TO_LEADER' })
    expect(cursed.players[1].pendingCurse).toBe(true)
    expect(cursed.players[0].usedCurseThisTurn).toBe(true)

    const secondTrySameTurn = apply(cursed, { type: 'APPLY_CURSE_TO_LEADER' })
    expect(secondTrySameTurn.players[1].pendingCurse).toBe(true)
    expect(secondTrySameTurn.players[0].usedCurseThisTurn).toBe(true)
  })

  it('cursed start roll of 1 causes immediate bust and turn ends', () => {
    mockedRollDie.mockReturnValueOnce(1)

    let state = initSingle(['poly'])
    state = {
      ...state,
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, pendingCurse: true } : player,
      ),
    }

    const next = apply(state, { type: 'ROLL_DIE' })

    expect(next.currentPlayerIndex).toBe(1)
    expect(next.players[0].pendingCurse).toBe(false)
    expect(next.lastRoll?.wasCurseStartRoll).toBe(true)
    expect(next.lastRoll?.busted).toBe(true)
  })

  it('cursed start roll >1 consumes curse and then normal roll works', () => {
    mockedRollDie
      .mockReturnValueOnce(4) // curse start roll
      .mockReturnValueOnce(6) // normal roll

    let state = initSingle(['poly'])
    state = {
      ...state,
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, pendingCurse: true } : player,
      ),
    }

    const afterCurseCheck = apply(state, { type: 'ROLL_DIE' })
    expect(afterCurseCheck.players[0].pendingCurse).toBe(false)
    expect(afterCurseCheck.players[0].turnTotal).toBe(0)
    expect(afterCurseCheck.currentPlayerIndex).toBe(0)

    const afterNormalRoll = apply(afterCurseCheck, { type: 'ROLL_DIE' })
    expect(afterNormalRoll.players[0].turnTotal).toBe(6)
    expect(afterNormalRoll.currentPlayerIndex).toBe(0)
  })

  it('triggers sudden death at round end when tied at target leagues', () => {
    const state = initSingle(['odys'])

    const setup = {
      ...state,
      targetLeagues: 100,
      currentPlayerIndex: 1,
      players: state.players.map((player, index) => {
        if (index === 0) {
          return { ...player, bankedLeagues: 100 }
        }

        return { ...player, bankedLeagues: 100, turnTotal: 0 }
      }),
    }

    const next = apply(setup, { type: 'END_TURN' })

    expect(next.currentPlayerIndex).toBe(0)
    expect(next.suddenDeath.active).toBe(true)
    expect(next.suddenDeath.contenders.length).toBe(2)
    expect(next.winnerId).toBeUndefined()
  })

  it('uses aiNames override for single-player AI display names', () => {
    const state = voyageHomeReducer(initialVoyageHomeState, {
      type: 'INIT_VOYAGE_HOME',
      payload: {
        mode: 'single',
        humanNames: ['Joe'],
        aiProfiles: ['posei'],
        aiNames: ['Zeus'],
      },
    })

    expect(state.players[1]?.isAI).toBe(true)
    expect(state.players[1]?.aiProfile).toBe('posei')
    expect(state.players[1]?.name).toBe('Zeus')
  })
})
