import { describe, expect, it } from 'vitest'
import {
  getCurrentPlayer,
  getGapToLeader,
  getHighestBankedLeagues,
  getLeaderIds,
  getLeaderTargetIndex,
  getStandings,
} from './selectors'
import { initialVoyageHomeState, voyageHomeReducer } from './reducer'

const initHotseat = () =>
  voyageHomeReducer(initialVoyageHomeState, {
    type: 'INIT_VOYAGE_HOME',
    payload: {
      mode: 'hotseat',
      humanNames: ['A', 'B', 'C'],
      targetLeagues: 100,
    },
  })

describe('voyageHome selectors', () => {
  it('returns current player', () => {
    const state = initHotseat()
    expect(getCurrentPlayer(state)?.name).toBe('A')
  })

  it('computes highest leagues and leader ids', () => {
    const state = {
      ...initHotseat(),
      players: initHotseat().players.map((player, index) => {
        if (index === 0) return { ...player, bankedLeagues: 18 }
        if (index === 1) return { ...player, bankedLeagues: 24 }
        return { ...player, bankedLeagues: 24 }
      }),
    }

    expect(getHighestBankedLeagues(state)).toBe(24)
    expect(getLeaderIds(state)).toEqual(['p2', 'p3'])
  })

  it('selects curse target by nearest upcoming turn order among tied leaders', () => {
    const base = initHotseat()
    const state = {
      ...base,
      currentPlayerIndex: 0,
      players: base.players.map((player, index) => {
        if (index === 1) return { ...player, bankedLeagues: 40 }
        if (index === 2) return { ...player, bankedLeagues: 40 }
        return player
      }),
    }

    expect(getLeaderTargetIndex(state)).toBe(1)
  })

  it('returns positive gap to leader for trailing player', () => {
    const base = initHotseat()
    const state = {
      ...base,
      currentPlayerIndex: 2,
      players: base.players.map((player, index) => {
        if (index === 0) return { ...player, bankedLeagues: 30 }
        if (index === 2) return { ...player, bankedLeagues: 11 }
        return player
      }),
    }

    expect(getGapToLeader(state)).toBe(19)
  })

  it('sorts standings by score desc with stable index tie-break', () => {
    const base = initHotseat()
    const state = {
      ...base,
      players: base.players.map((player, index) => {
        if (index === 0) return { ...player, bankedLeagues: 25 }
        if (index === 1) return { ...player, bankedLeagues: 25 }
        return { ...player, bankedLeagues: 10 }
      }),
    }

    const standings = getStandings(state)
    expect(standings.map((entry) => entry.playerId)).toEqual(['p1', 'p2', 'p3'])
  })
})
