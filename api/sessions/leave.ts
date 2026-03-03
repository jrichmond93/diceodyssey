import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js'
import { publishSessionRealtimeEventBestEffort } from '../_lib/realtime.js'
import { mapSessionSnapshot, type SeatRow, type SessionRow } from '../_lib/sessionSnapshot.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'

interface LeaveBody {
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
    const body = await readJsonBody<LeaveBody>(req)
    const sessionId = (body.sessionId ?? (req.query.id as string) ?? '').trim()

    if (!sessionId) {
      sendJson(res, 400, {
        accepted: false,
        action: 'LEAVE',
        reason: 'SESSION_CLOSED',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId: '',
      })
      return
    }

    const supabase = getSupabaseAdminClient()
    const now = new Date().toISOString()

    const seatResult = await supabase
      .from('dice_player_seats')
      .select('seat, user_id')
      .eq('session_id', sessionId)
      .eq('user_id', user.userId)
      .maybeSingle()

    if (seatResult.error) {
      throw seatResult.error
    }

    if (!seatResult.data) {
      sendJson(res, 200, {
        accepted: true,
        action: 'LEAVE',
        requestId: body.clientRequestId ?? `leave-${sessionId}`,
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
        action: 'LEAVE',
        reason: 'SESSION_CLOSED',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
      })
      return
    }

    const session = sessionResult.data as SessionLifecycleRow

    await supabase
      .from('dice_player_seats')
      .update({
        connected: false,
        updated_at: now,
      })
      .eq('session_id', sessionId)
      .eq('user_id', user.userId)

    let updatedSession = session
    if (session.status === 'lobby' || session.status === 'active') {
      const sessionUpdate = await supabase
        .from('dice_sessions')
        .update({
          status: 'abandoned',
          version: session.version + 1,
          updated_at: now,
        })
        .eq('id', sessionId)
        .eq('version', session.version)
        .select('id, version, status, game_state, created_at, updated_at')
        .single()

      if (!sessionUpdate.error && sessionUpdate.data) {
        updatedSession = sessionUpdate.data as SessionLifecycleRow
      }
    }

    await supabase.from('dice_session_events').insert({
      session_id: sessionId,
      event_type: 'PLAYER_LEFT',
      payload: {
        userId: user.userId,
        requestId: body.clientRequestId ?? null,
        reason: 'leave',
      },
      created_at: now,
    })

    if (updatedSession.status === 'abandoned') {
      await supabase.from('dice_session_events').insert({
        session_id: sessionId,
        event_type: 'GAME_ABANDONED',
        payload: {
          actorUserId: user.userId,
          requestId: body.clientRequestId ?? null,
          reason: 'leave',
        },
        created_at: now,
      })
    }

    const seatsResult = await supabase
      .from('dice_player_seats')
      .select('seat, user_id, display_name, avatar_key, connected, is_ai')
      .eq('session_id', sessionId)
      .order('seat', { ascending: true })

    if (seatsResult.error) {
      throw seatsResult.error
    }

    const snapshot = mapSessionSnapshot(updatedSession as SessionRow, (seatsResult.data ?? []) as SeatRow[])

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'PLAYER_LEFT',
      userId: user.userId,
    })

    if (snapshot.status === 'abandoned') {
      await publishSessionRealtimeEventBestEffort(sessionId, {
        type: 'GAME_ABANDONED',
        reason: 'leave',
        snapshot,
      })
    }

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'SESSION_SNAPSHOT',
      snapshot,
    })

    sendJson(res, 200, {
      accepted: true,
      action: 'LEAVE',
      requestId: body.clientRequestId ?? `leave-${sessionId}`,
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
      error: 'SESSION_LEAVE_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
