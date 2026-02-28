export type Color = 'red' | 'blue' | 'green'

export type ActionType = 'move' | 'claim' | 'sabotage'

export type GameMode = 'single' | 'hotseat'

export type Difficulty = 'easy' | 'medium'

export type TurnResolutionStage = 'idle' | 'resolving'

export type TurnResolutionPlaybackStage = 'idle' | 'move' | 'claim' | 'sabotage' | 'post'

export interface TurnResolutionState {
  active: boolean
  stage: TurnResolutionStage
  message: string
}

export interface TurnResolutionSnapshot extends DebugTurnRecord {
  sabotageMessage: string
  claim: {
    landedPlanetId?: number
    landedPlanetFace?: number
    successes: number
  }
}

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
  aiCharacterSlug?: string
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
  animationEnabled: boolean
  debugLog: DebugTurnRecord[]
  turnResolution: TurnResolutionState
  latestTurnResolution?: TurnResolutionSnapshot
  turnResolutionHistory: TurnResolutionSnapshot[]
}

export interface InitGamePayload {
  mode: GameMode
  humanNames: string[]
  aiCount: number
  difficulty: Difficulty
  debugEnabled: boolean
  animationEnabled: boolean
}

export type GameAction =
  | { type: 'INIT_GAME'; payload: InitGamePayload }
  | { type: 'ALLOCATE_DICE'; payload: Allocation }
  | { type: 'START_TURN_RESOLUTION'; payload?: { stage?: TurnResolutionStage; message?: string } }
  | { type: 'END_TURN_RESOLUTION' }
  | { type: 'RESOLVE_TURN' }
  | { type: 'NEXT_PLAYER' }
  | { type: 'NEW_GAME' }
