import { getAvailableRevealFaces, getAvailableSabotageFaces, getCurrentPlayer } from './selectors'
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
    const sabotageFaces = getAvailableSabotageFaces(state)
    if (sabotageFaces.length > 0) {
      const targetFace = [...sabotageFaces].sort((a, b) => b - a)[0]

      if (player.aiProfile === 'circe' || sabotageFaces.length >= 5) {
        return { type: 'CHOOSE_SABOTAGE', payload: { targetFace } }
      }
    }
  }

  return { type: 'END_TURN' }
}
