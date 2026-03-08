import { getGapToLeader, getLeaderTargetIndex } from './selectors.js'
import type { VoyageHomePlayer, VoyageHomeState } from './types.js'

export type VoyageHomeAiDecision = 'ROLL_DIE' | 'HOLD_TURN_TOTAL' | 'APPLY_CURSE_TO_LEADER'

const canUseCurse = (player: VoyageHomePlayer, state: VoyageHomeState): boolean => {
  if (player.usedCurseThisTurn || player.hasRolledThisTurn || player.turnTotal > 0) {
    return false
  }

  const targetIndex = getLeaderTargetIndex(state)
  if (targetIndex === null) {
    return false
  }

  const target = state.players[targetIndex]
  if (!target) {
    return false
  }

  return !target.pendingCurse
}

const getHoldThreshold = (player: VoyageHomePlayer, state: VoyageHomeState): number => {
  const gapToLeader = getGapToLeader(state)
  const isBehind = gapToLeader > 0

  switch (player.aiProfile) {
    case 'posei':
      return isBehind ? 22 : 18
    case 'poly':
      return isBehind ? 28 : 24
    case 'odys':
    default:
      return isBehind ? 16 : 14
  }
}

const shouldUseCurse = (player: VoyageHomePlayer, state: VoyageHomeState): boolean => {
  if (!canUseCurse(player, state)) {
    return false
  }

  const gapToLeader = getGapToLeader(state)
  const isLeadingOrTied = gapToLeader === 0

  switch (player.aiProfile) {
    case 'posei':
      return true
    case 'poly':
      return !isLeadingOrTied
    case 'odys':
    default:
      return gapToLeader >= 12
  }
}

export const chooseVoyageHomeAction = (
  player: VoyageHomePlayer,
  state: VoyageHomeState,
): VoyageHomeAiDecision => {
  if (state.winnerId || !player.isAI) {
    return 'ROLL_DIE'
  }

  if (shouldUseCurse(player, state)) {
    return 'APPLY_CURSE_TO_LEADER'
  }

  if (player.turnTotal <= 0) {
    return 'ROLL_DIE'
  }

  if (player.bankedLeagues + player.turnTotal >= state.targetLeagues) {
    return 'HOLD_TURN_TOTAL'
  }

  const holdThreshold = getHoldThreshold(player, state)
  return player.turnTotal >= holdThreshold ? 'HOLD_TURN_TOTAL' : 'ROLL_DIE'
}
