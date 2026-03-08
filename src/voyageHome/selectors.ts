import type { VoyageHomePlayer, VoyageHomeState } from './types.js'

export interface VoyageHomeStanding {
  playerId: string
  name: string
  bankedLeagues: number
  turnTotal: number
  pendingCurse: boolean
  index: number
}

export const getCurrentPlayer = (state: VoyageHomeState): VoyageHomePlayer | undefined =>
  state.players[state.currentPlayerIndex]

export const getHighestBankedLeagues = (state: VoyageHomeState): number =>
  state.players.length === 0 ? 0 : Math.max(...state.players.map((player) => player.bankedLeagues))

export const getLeaderIndexes = (state: VoyageHomeState): number[] => {
  const highest = getHighestBankedLeagues(state)
  return state.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.bankedLeagues === highest)
    .map(({ index }) => index)
}

export const getLeaderIds = (state: VoyageHomeState): string[] =>
  getLeaderIndexes(state).map((index) => state.players[index]?.id).filter(Boolean) as string[]

export const getLeaderTargetIndex = (
  state: VoyageHomeState,
  actorIndex: number = state.currentPlayerIndex,
): number | null => {
  const actor = state.players[actorIndex]
  if (!actor) {
    return null
  }

  const highest = getHighestBankedLeagues(state)
  const candidateIndexes = state.players
    .map((player, index) => ({ player, index }))
    .filter(({ player, index }) => index !== actorIndex && player.bankedLeagues === highest)
    .map(({ index }) => index)

  if (candidateIndexes.length === 0) {
    return null
  }

  candidateIndexes.sort((a, b) => {
    const aDistance = (a - actorIndex + state.players.length) % state.players.length
    const bDistance = (b - actorIndex + state.players.length) % state.players.length
    return aDistance - bDistance
  })

  return candidateIndexes[0] ?? null
}

export const getGapToLeader = (state: VoyageHomeState, playerIndex: number = state.currentPlayerIndex): number => {
  const player = state.players[playerIndex]
  if (!player) {
    return 0
  }

  return Math.max(0, getHighestBankedLeagues(state) - player.bankedLeagues)
}

export const getStandings = (state: VoyageHomeState): VoyageHomeStanding[] =>
  state.players
    .map((player, index) => ({
      playerId: player.id,
      name: player.name,
      bankedLeagues: player.bankedLeagues,
      turnTotal: player.turnTotal,
      pendingCurse: player.pendingCurse,
      index,
    }))
    .sort((a, b) => {
      if (b.bankedLeagues !== a.bankedLeagues) {
        return b.bankedLeagues - a.bankedLeagues
      }

      return a.index - b.index
    })
