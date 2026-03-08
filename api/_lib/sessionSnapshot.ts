import type { SessionSnapshot } from '../../src/multiplayer/types.js'
import { resolveSessionGameSlug } from './gameSlugCompat.js'

export interface SessionRow {
  id: string
  game_slug?: string | null
  version: number
  status: 'lobby' | 'active' | 'finished' | 'abandoned'
  game_state: unknown
  created_at: string
  updated_at: string
}

export interface SeatRow {
  seat: number
  user_id: string
  display_name: string
  avatar_key?: string | null
  connected: boolean
  is_ai: boolean
}

export const mapSessionSnapshot = (session: SessionRow, seats: SeatRow[]): SessionSnapshot => ({
  sessionId: session.id,
  gameSlug: resolveSessionGameSlug(session),
  version: session.version,
  status: session.status,
  gameState: session.game_state as SessionSnapshot['gameState'],
  playerSeats: seats.map((seat) => ({
    seat: seat.seat,
    userId: seat.user_id,
    displayName: seat.display_name,
    avatarKey: seat.avatar_key ?? undefined,
    connected: seat.connected,
    isAI: seat.is_ai,
  })),
  createdAt: session.created_at,
  updatedAt: session.updated_at,
})
