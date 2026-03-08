export type MythicRevealMode = 'single' | 'online'

export type MythicRevealAiProfile = 'circe' | 'poly'

export interface MythicRevealBoard {
  imageId: string
  imageName: string
  sectionsRevealed: number[]
}

export interface MythicRevealPlayer {
  id: string
  name: string
  isAI: boolean
  aiProfile?: MythicRevealAiProfile
  board: MythicRevealBoard
}

export interface MythicRevealTurnRoll {
  dice: number[]
  canSabotage: boolean
}

export interface MythicRevealLogEntry {
  id: string
  turn: number
  message: string
}

export interface MythicRevealState {
  started: boolean
  mode: MythicRevealMode
  players: [MythicRevealPlayer, MythicRevealPlayer]
  currentPlayerIndex: 0 | 1
  turn: number
  winnerId?: string
  pendingRoll?: MythicRevealTurnRoll
  log: MythicRevealLogEntry[]
  debugEnabled: boolean
}

export interface InitMythicRevealPayload {
  mode: MythicRevealMode
  humanName?: string
  rivalName?: string
  aiProfile?: MythicRevealAiProfile
  debugEnabled?: boolean
  forcedImageIds?: [string, string]
}

export type MythicRevealAction =
  | { type: 'INIT_MYTHIC_REVEAL'; payload: InitMythicRevealPayload }
  | { type: 'ROLL_DICE'; payload?: { dice?: number[]; canSabotage?: boolean } }
  | { type: 'CHOOSE_REVEAL'; payload: { face: number } }
  | { type: 'CHOOSE_SABOTAGE'; payload: { targetFace: number } }
  | { type: 'END_TURN' }
  | { type: 'NEW_GAME' }
