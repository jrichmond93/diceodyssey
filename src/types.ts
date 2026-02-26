export type Color = 'red' | 'blue' | 'green'

export type ActionType = 'move' | 'claim' | 'sabotage'

export type GameMode = 'single' | 'hotseat'

export type Difficulty = 'easy' | 'medium'

export interface Die {
  id: string
  color: Color
}

export type Allocation = Record<ActionType, string[]>

export interface Planet {
  id: number
  face: number
  claimed: boolean
  revealed: boolean
}

export interface Player {
  id: string
  name: string
  isAI: boolean
  shipPos: number
  macGuffins: number
  skippedTurns: number
  skipImmunity: boolean
  defense: number
  dicePool: Die[]
  allocation?: Allocation
}

export interface TurnEvent {
  id: string
  turn: number
  message: string
}

export interface DebugDieRoll {
  dieId: string
  color: Color
  raw: number
  modifier: number
  final: number
}

export interface DebugTurnRecord {
  turn: number
  round: number
  playerId: string
  playerName: string
  skipped: boolean
  allocation: Allocation
  rolls: {
    move: DebugDieRoll[]
    claim: DebugDieRoll[]
    sabotage: DebugDieRoll[]
  }
  totals: {
    move: number
    sabotage: number
    gainedMacGuffins: number
  }
  position: {
    before: number
    after: number
  }
  skips: {
    before: number
    after: number
    appliedToTarget?: {
      targetId: string
      targetName: string
      amount: number
      before: number
      after: number
      blockedByImmunity?: boolean
    }
  }
  galaxy: {
    before: number
    after: number
  }
  winnerAfterTurn?: {
    winnerId?: string
    winnerReason?: 'race' | 'survival'
  }
  notes: string[]
}

export interface GameState {
  started: boolean
  mode: GameMode
  players: Player[]
  currentPlayerIndex: number
  turn: number
  galaxy: Planet[]
  difficulty: Difficulty
  winnerId?: string
  winnerReason?: 'race' | 'survival'
  log: TurnEvent[]
  debugEnabled: boolean
  debugLog: DebugTurnRecord[]
}

export interface InitGamePayload {
  mode: GameMode
  humanNames: string[]
  aiCount: number
  difficulty: Difficulty
  debugEnabled: boolean
}

export type GameAction =
  | { type: 'INIT_GAME'; payload: InitGamePayload }
  | { type: 'ALLOCATE_DICE'; payload: Allocation }
  | { type: 'RESOLVE_TURN' }
  | { type: 'NEXT_PLAYER' }
  | { type: 'NEW_GAME' }
