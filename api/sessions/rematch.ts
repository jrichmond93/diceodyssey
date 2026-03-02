import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js'
import { publishSessionRealtimeEventBestEffort } from '../_lib/realtime.js'
import { createHotseatGameState } from '../_lib/serverGameState.js'
import { mapSessionSnapshot, type SeatRow, type SessionRow } from '../_lib/sessionSnapshot.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'

interface RematchBody {
  sessionId?: string
  clientRequestId?: string
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const body = await readJsonBody<RematchBody>(req)
    const sessionId = (body.sessionId ?? (req.query.id as string) ?? '').trim()

    if (!sessionId) {
      sendJson(res, 400, {
        accepted: false,
        action: 'REMATCH',
        reason: 'SESSION_CLOSED',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId: '',
      })
      return
    }

    const supabase = getSupabaseAdminClient()

    const seatMembership = await supabase
      .from('dice_player_seats')
      .select('user_id')
      .eq('session_id', sessionId)
      .eq('user_id', user.userId)
      .maybeSingle()

    if (seatMembership.error) {
      throw seatMembership.error
    }

    if (!seatMembership.data) {
      sendJson(res, 403, {
        accepted: false,
        action: 'REMATCH',
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
        action: 'REMATCH',
        reason: 'SESSION_CLOSED',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
      })
      return
    }

    const session = sessionResult.data as SessionLifecycleRow

    if (session.status === 'active' || session.status === 'lobby') {
      sendJson(res, 409, {
        accepted: false,
        action: 'REMATCH',
        reason: 'REMATCH_NOT_READY',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
        latestVersion: session.version,
      })
      return
    }

    const seatsResult = await supabase
      .from('dice_player_seats')
      .select('seat, user_id, display_name, connected, is_ai')
      .eq('session_id', sessionId)
      .order('seat', { ascending: true })

    if (seatsResult.error) {
      throw seatsResult.error
    }

    const seats = (seatsResult.data ?? []) as SeatRow[]
    const connectedHumanNames = seats
      .filter((seat) => !seat.is_ai && seat.connected)
      .map((seat) => seat.display_name)

    if (connectedHumanNames.length < 2) {
      sendJson(res, 400, {
        accepted: false,
        action: 'REMATCH',
        reason: 'REMATCH_REQUIRES_PLAYERS',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
      })
      return
    }

    const now = new Date().toISOString()
    const nextGameState = createHotseatGameState(connectedHumanNames)

    const sessionUpdate = await supabase
      .from('dice_sessions')
      .update({
        status: 'active',
        game_state: nextGameState,
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
        action: 'REMATCH',
        reason: 'REMATCH_NOT_READY',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
        latestVersion: session.version,
      })
      return
    }

    await supabase.from('dice_session_events').insert({
      session_id: sessionId,
      event_type: 'REMATCH_STARTED',
      payload: {
        actorUserId: user.userId,
        requestId: body.clientRequestId ?? null,
      },
      created_at: now,
    })

    const snapshot = mapSessionSnapshot(sessionUpdate.data as SessionRow, seats)

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'REMATCH_STARTED',
      snapshot,
    })

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'SESSION_SNAPSHOT',
      snapshot,
    })

    sendJson(res, 200, {
      accepted: true,
      action: 'REMATCH',
      requestId: body.clientRequestId ?? `rematch-${sessionId}`,
      sessionId,
      latestVersion: (sessionUpdate.data as SessionRow).version,
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
      error: 'SESSION_REMATCH_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
