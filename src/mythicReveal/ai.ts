import { getAvailableRevealFaces, getCurrentPlayer, getOpponentPlayer } from './selectors'
import type { MythicRevealAction, MythicRevealPlayer, MythicRevealState } from './types'

export const chooseMythicRevealAction = (
  state: MythicRevealState,
  player: MythicRevealPlayer = getCurrentPlayer(state),
): MythicRevealAction | null => {
  if (!player.isAI || state.winnerId) {
    return null
  }

  if (!state.pendingRoll) {
    return { type: 'ROLL_DICE' }
  }

  const availableReveals = getAvailableRevealFaces(state)
  if (availableReveals.length > 0) {
    const revealFace =
      player.aiProfile === 'poly'
        ? availableReveals[availableReveals.length - 1]
        : availableReveals[0]

    return { type: 'CHOOSE_REVEAL', payload: { face: revealFace } }
  }

  if (state.pendingRoll.canSabotage) {
    const opponent = getOpponentPlayer(state)
    if (opponent.board.sectionsRevealed.length > 0) {
      const targetFace = [...opponent.board.sectionsRevealed].sort((a, b) => b - a)[0]

      if (player.aiProfile === 'circe' || opponent.board.sectionsRevealed.length >= 5) {
        return { type: 'CHOOSE_SABOTAGE', payload: { targetFace } }
      }
    }
  }

  return { type: 'END_TURN' }
}
