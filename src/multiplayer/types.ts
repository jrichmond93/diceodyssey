import type { Allocation, GameState } from '../types.js'

export type SessionStatus = 'lobby' | 'active' | 'finished' | 'abandoned'

export type MatchStatus = 'lobby' | 'in_progress' | 'between_games' | 'closed'

export type OnlineGameStatus = 'active' | 'finished' | 'abandoned'

export interface SessionPlayerSeat {
  seat: number
  userId: string
  displayName: string
  avatarKey?: string
  connected: boolean
  isAI: boolean
}

export interface SessionSnapshot {
  sessionId: string
  version: number
  status: SessionStatus
  gameState: GameState
  playerSeats: SessionPlayerSeat[]
  createdAt: string
  updatedAt: string
}

export interface TurnIntent {
  sessionId: string
  actorUserId: string
  actorPlayerId: string
  expectedVersion: number
  allocation: Allocation
  clientRequestId: string
  sentAt: string
}

export type TurnAckReason =
  | 'NOT_YOUR_TURN'
  | 'STALE_VERSION'
  | 'INVALID_ALLOCATION'
  | 'SESSION_CLOSED'

export interface TurnAck {
  accepted: boolean
  reason?: TurnAckReason
  latestVersion?: number
  requestId: string
}

export type SessionLifecycleAction = 'RESIGN' | 'LEAVE' | 'REMATCH'

export type SessionLifecycleReason =
  | 'SESSION_CLOSED'
  | 'NOT_IN_SESSION'
  | 'REMATCH_NOT_READY'
  | 'REMATCH_REQUIRES_PLAYERS'

export interface SessionLifecycleAck {
  accepted: boolean
  action: SessionLifecycleAction
  sessionId: string
  reason?: SessionLifecycleReason
  latestVersion?: number
  requestId: string
  snapshot?: SessionSnapshot
}

export type RealtimeEvent =
  | { type: 'SESSION_SNAPSHOT'; snapshot: SessionSnapshot }
  | { type: 'TURN_ACCEPTED'; requestId: string; version: number }
  | { type: 'TURN_RESOLVED'; snapshot: SessionSnapshot }
  | { type: 'PLAYER_JOINED'; userId: string; displayName: string; avatarKey?: string }
  | { type: 'PLAYER_LEFT'; userId: string }
  | { type: 'MATCH_FOUND'; sessionId: string }
  | { type: 'GAME_ABANDONED'; snapshot: SessionSnapshot; reason: 'resign' | 'leave' }
  | { type: 'REMATCH_READY'; sessionId: string }
  | { type: 'REMATCH_STARTED'; snapshot: SessionSnapshot }
  | { type: 'GAME_FINISHED'; snapshot: SessionSnapshot }

export interface MultiplayerIdentity {
  userId: string
  displayName: string
}

export interface DiceSessionChannel {
  topic: `dice_session:${string}`
}

export const getDiceSessionChannelTopic = (sessionId: string): DiceSessionChannel['topic'] =>
  `dice_session:${sessionId}`
