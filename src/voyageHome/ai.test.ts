import { describe, expect, it } from 'vitest'
import { chooseVoyageHomeAction } from './ai'
import { initialVoyageHomeState, voyageHomeReducer } from './reducer'
import type { VoyageHomeState } from './types'

const initSingle = (profile: 'posei' | 'odys' | 'poly') =>
  voyageHomeReducer(initialVoyageHomeState, {
    type: 'INIT_VOYAGE_HOME',
    payload: {
      mode: 'single',
      humanNames: ['Skipper'],
      aiProfiles: [profile],
      targetLeagues: 100,
    },
  })

const withCurrentAi = (state: VoyageHomeState): VoyageHomeState => ({
  ...state,
  currentPlayerIndex: 1,
})

describe('chooseVoyageHomeAction', () => {
  it('Posei curses whenever legal', () => {
    const base = withCurrentAi(initSingle('posei'))
    const state = {
      ...base,
      players: base.players.map((player, index) =>
        index === 0 ? { ...player, bankedLeagues: 30 } : { ...player, bankedLeagues: 10 },
      ),
    }

    const ai = state.players[1]
    expect(chooseVoyageHomeAction(ai, state)).toBe('APPLY_CURSE_TO_LEADER')
  })

  it('Odys curses only when leader gap >= 12', () => {
    const base = withCurrentAi(initSingle('odys'))
    const noCurseState = {
      ...base,
      players: base.players.map((player, index) =>
        index === 0 ? { ...player, bankedLeagues: 20 } : { ...player, bankedLeagues: 12 },
      ),
    }
    const curseState = {
      ...base,
      players: base.players.map((player, index) =>
        index === 0 ? { ...player, bankedLeagues: 30 } : { ...player, bankedLeagues: 10 },
      ),
    }

    expect(chooseVoyageHomeAction(noCurseState.players[1], noCurseState)).toBe('ROLL_DIE')
    expect(chooseVoyageHomeAction(curseState.players[1], curseState)).toBe('APPLY_CURSE_TO_LEADER')
  })

  it('Poly curses when behind and legal', () => {
    const base = withCurrentAi(initSingle('poly'))
    const state = {
      ...base,
      players: base.players.map((player, index) =>
        index === 0 ? { ...player, bankedLeagues: 18 } : { ...player, bankedLeagues: 9 },
      ),
    }

    expect(chooseVoyageHomeAction(state.players[1], state)).toBe('APPLY_CURSE_TO_LEADER')
  })

  it('holds when turn total reaches profile threshold', () => {
    const base = withCurrentAi(initSingle('odys'))
    const state = {
      ...base,
      players: base.players.map((player, index) => {
        if (index === 0) {
          return { ...player, bankedLeagues: 20 }
        }

        return { ...player, bankedLeagues: 20, turnTotal: 14, hasRolledThisTurn: true }
      }),
    }

    expect(chooseVoyageHomeAction(state.players[1], state)).toBe('HOLD_TURN_TOTAL')
  })

  it('holds when current turn would cross target leagues', () => {
    const base = withCurrentAi(initSingle('poly'))
    const state = {
      ...base,
      players: base.players.map((player, index) =>
        index === 1
          ? { ...player, bankedLeagues: 95, turnTotal: 6, hasRolledThisTurn: true }
          : { ...player, bankedLeagues: 99 },
      ),
    }

    expect(chooseVoyageHomeAction(state.players[1], state)).toBe('HOLD_TURN_TOTAL')
  })

  it('rolls when curse is not legal and hold threshold not met', () => {
    const base = withCurrentAi(initSingle('posei'))
    const state = {
      ...base,
      players: base.players.map((player, index) => {
        if (index === 0) {
          return { ...player, bankedLeagues: 28, pendingCurse: true }
        }

        return { ...player, bankedLeagues: 12, turnTotal: 17, hasRolledThisTurn: true }
      }),
    }

    expect(chooseVoyageHomeAction(state.players[1], state)).toBe('ROLL_DIE')
  })
})
