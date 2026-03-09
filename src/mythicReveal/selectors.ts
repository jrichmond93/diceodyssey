import { MYTHIC_REVEAL_SECTION_COUNT } from './constants'
import type { MythicRevealPlayer, MythicRevealState } from './types'

const isValidFace = (face: number): boolean => Number.isInteger(face) && face >= 1 && face <= MYTHIC_REVEAL_SECTION_COUNT

export const getCurrentPlayer = (state: MythicRevealState): MythicRevealPlayer =>
  state.players[state.currentPlayerIndex]

export const getOpponentPlayer = (state: MythicRevealState): MythicRevealPlayer =>
  state.players[state.currentPlayerIndex === 0 ? 1 : 0]

export const getAvailableRevealFaces = (state: MythicRevealState): number[] => {
  if (!state.pendingRoll) {
    return []
  }

  const current = getCurrentPlayer(state)
  const revealed = new Set(current.board.sectionsRevealed)
  const consumed = new Set(state.pendingRoll.consumedFaces)

  return Array.from(new Set(state.pendingRoll.dice))
    .filter(isValidFace)
    .filter((face) => !consumed.has(face))
    .filter((face) => !revealed.has(face))
    .sort((a, b) => a - b)
}

export const getAvailableSabotageFaces = (state: MythicRevealState): number[] => {
  if (!state.pendingRoll?.canSabotage) {
    return []
  }

  const opponent = getOpponentPlayer(state)
  const rolled = new Set(Array.from(new Set(state.pendingRoll.dice)).filter(isValidFace))
  const consumed = new Set(state.pendingRoll.consumedFaces)

  return [...opponent.board.sectionsRevealed]
    .filter((face) => rolled.has(face) && !consumed.has(face))
    .sort((a, b) => a - b)
}

export const isPlayerComplete = (player: MythicRevealPlayer): boolean =>
  player.board.sectionsRevealed.length >= MYTHIC_REVEAL_SECTION_COUNT
