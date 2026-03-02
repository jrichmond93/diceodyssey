import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { GameState } from '../../src/types.js'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js'
import { publishSessionRealtimeEventBestEffort } from '../_lib/realtime.js'
import { mapSessionSnapshot, type SeatRow, type SessionRow } from '../_lib/sessionSnapshot.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'

interface ResignBody {
  sessionId?: string
  clientRequestId?: string
}

interface SeatMembershipRow {
  seat: number
  user_id: string
}

type SessionStatus = 'lobby' | 'active' | 'finished' | 'abandoned'

interface SessionLifecycleRow {
  id: string
  version: number
  status: SessionStatus
  game_state: unknown
  created_at: string
  updated_at: string
}

const isGameStateLike = (state: unknown): state is GameState => {
  if (!state || typeof state !== 'object') {
    return false
  }

  const candidate = state as Partial<GameState>
  return (
    typeof candidate.currentPlayerIndex === 'number' &&
    typeof candidate.turn === 'number' &&
    Array.isArray(candidate.players) &&
    Array.isArray(candidate.galaxy)
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const body = await readJsonBody<ResignBody>(req)
    const sessionId = (body.sessionId ?? (req.query.id as string) ?? '').trim()

    if (!sessionId) {
      sendJson(res, 400, {
        accepted: false,
        action: 'RESIGN',
        reason: 'SESSION_CLOSED',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId: '',
      })
      return
    }

    const supabase = getSupabaseAdminClient()
    const now = new Date().toISOString()

    const seatMembership = await supabase
      .from('dice_player_seats')
      .select('seat, user_id')
      .eq('session_id', sessionId)
      .eq('user_id', user.userId)
      .maybeSingle()

    if (seatMembership.error) {
      throw seatMembership.error
    }

    if (!seatMembership.data) {
      sendJson(res, 403, {
        accepted: false,
        action: 'RESIGN',
        reason: 'NOT_IN_SESSION',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
      })
      return
    }

    const sessionResult = await supabase
      .from('dice_sessions')
      .select('id, version, status, game_state, created_at, updated_at')
      .eq('id', sessionId)
      .single()

    if (sessionResult.error || !sessionResult.data) {
      sendJson(res, 404, {
        accepted: false,
        action: 'RESIGN',
        reason: 'SESSION_CLOSED',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
      })
      return
    }

    const session = sessionResult.data as SessionLifecycleRow

    const seatsResult = await supabase
      .from('dice_player_seats')
      .select('seat, user_id, display_name, connected, is_ai')
      .eq('session_id', sessionId)
      .order('seat', { ascending: true })

    if (seatsResult.error) {
      throw seatsResult.error
    }

    const seats = (seatsResult.data ?? []) as SeatRow[]

    if (session.status === 'finished' || session.status === 'abandoned') {
      const snapshot = mapSessionSnapshot(session as SessionRow, seats)
      sendJson(res, 200, {
        accepted: true,
        action: 'RESIGN',
        requestId: body.clientRequestId ?? `resign-${sessionId}`,
        sessionId,
        latestVersion: session.version,
        snapshot,
      })
      return
    }

    if (!isGameStateLike(session.game_state)) {
      sendJson(res, 400, {
        accepted: false,
        action: 'RESIGN',
        reason: 'SESSION_CLOSED',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
      })
      return
    }

    const seatMembershipRow = seatMembership.data as SeatMembershipRow
    const resigningPlayerId = `p${seatMembershipRow.seat}`
    const winnerPlayer = session.game_state.players.find((player) => player.id !== resigningPlayerId)

    const updatedGameState: GameState = {
      ...session.game_state,
      winnerId: winnerPlayer?.id,
      winnerReason: 'survival',
      turnResolution: {
        active: false,
        stage: 'idle',
        message: `${resigningPlayerId} resigned.`,
      },
      log: [
        ...session.game_state.log,
        {
          id: crypto.randomUUID(),
          turn: session.game_state.turn,
          message: `${seatMembershipRow.user_id} resigned.`,
        },
      ],
    }

    const sessionUpdate = await supabase
      .from('dice_sessions')
      .update({
        status: 'finished',
        game_state: updatedGameState,
        version: session.version + 1,
        updated_at: now,
      })
      .eq('id', sessionId)
      .eq('version', session.version)
      .select('id, version, status, game_state, created_at, updated_at')
      .single()

    if (sessionUpdate.error || !sessionUpdate.data) {
      sendJson(res, 409, {
        accepted: false,
        action: 'RESIGN',
        reason: 'SESSION_CLOSED',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
      })
      return
    }

    const updatedSession = sessionUpdate.data as SessionRow

    await supabase.from('dice_session_events').insert({
      session_id: sessionId,
      event_type: 'GAME_ABANDONED',
      payload: {
        actorUserId: user.userId,
        requestId: body.clientRequestId ?? null,
        reason: 'resign',
      },
      created_at: now,
    })

    const snapshot = mapSessionSnapshot(updatedSession, seats)

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'GAME_ABANDONED',
      reason: 'resign',
      snapshot,
    })

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'GAME_FINISHED',
      snapshot,
    })

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'SESSION_SNAPSHOT',
      snapshot,
    })

    sendJson(res, 200, {
      accepted: true,
      action: 'RESIGN',
      requestId: body.clientRequestId ?? `resign-${sessionId}`,
      sessionId,
      latestVersion: updatedSession.version,
      snapshot,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'SESSION_RESIGN_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
