export type VoyageHomeMode = 'single' | 'hotseat'

export type VoyageHomeAiProfile = 'posei' | 'odys' | 'poly'

export interface VoyageHomePlayer {
  id: string
  name: string
  isAI: boolean
  aiProfile?: VoyageHomeAiProfile
  avatarKey?: string
  bankedLeagues: number
  turnTotal: number
  pendingCurse: boolean
  usedCurseThisTurn: boolean
  hasRolledThisTurn: boolean
  curseStartResolvedThisTurn: boolean
}

export interface VoyageHomeLogEntry {
  id: string
  turn: number
  message: string
}

export interface VoyageHomeLastRoll {
  playerId: string
  value: number
  wasCurseStartRoll: boolean
  busted: boolean
}

export interface VoyageHomeState {
  started: boolean
  mode: VoyageHomeMode
  targetLeagues: number
  players: VoyageHomePlayer[]
  currentPlayerIndex: number
  turn: number
  round: number
  winnerId?: string
  log: VoyageHomeLogEntry[]
  debugEnabled: boolean
  suddenDeath: {
    active: boolean
    baselineLeagues?: number
    contenders: string[]
  }
  lastRoll?: VoyageHomeLastRoll
}

export interface InitVoyageHomePayload {
  mode: VoyageHomeMode
  humanNames: string[]
  aiProfiles?: VoyageHomeAiProfile[]
  aiNames?: string[]
  targetLeagues?: number
  debugEnabled?: boolean
}

export type VoyageHomeAction =
  | { type: 'INIT_VOYAGE_HOME'; payload: InitVoyageHomePayload }
  | { type: 'ROLL_DIE' }
  | { type: 'HOLD_TURN_TOTAL' }
  | { type: 'APPLY_CURSE_TO_LEADER' }
  | { type: 'END_TURN' }
  | { type: 'NEXT_PLAYER' }
  | { type: 'START_SUDDEN_DEATH' }
  | { type: 'NEW_GAME' }
