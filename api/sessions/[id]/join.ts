import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../../_lib/auth.js'
import { methodNotAllowed, sendJson } from '../../_lib/http.js'
import { getSupabaseAdminClient } from '../../_lib/supabase.js'
import { publishSessionRealtimeEventBestEffort } from '../../_lib/realtime.js'
import { mapSessionSnapshot, type SeatRow, type SessionRow } from '../../_lib/sessionSnapshot.js'
import { createHotseatGameState } from '../../_lib/serverGameState.js'
import { resolveUserDisplayName } from '../../_lib/displayName.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  const sessionId = req.query.id as string

  if (!sessionId) {
    sendJson(res, 400, {
      error: 'INVALID_SESSION_ID',
    })
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()
    const displayName = await resolveUserDisplayName(supabase, user)

    const { data: existingSeat, error: existingSeatError } = await supabase
      .from('dice_player_seats')
      .select('seat, user_id')
      .eq('session_id', sessionId)
      .eq('user_id', user.userId)
      .maybeSingle()

    if (existingSeatError) {
      throw existingSeatError
    }

    if (!existingSeat) {
      const { data: seatRows, error: seatListError } = await supabase
        .from('dice_player_seats')
        .select('seat')
        .eq('session_id', sessionId)
        .order('seat', { ascending: true })

      if (seatListError) {
        throw seatListError
      }

      if ((seatRows?.length ?? 0) >= 2) {
        sendJson(res, 409, {
          error: 'MATCH_FULL',
        })
        return
      }

      const nextSeat = Math.max(0, ...(seatRows ?? []).map((row) => row.seat)) + 1

      const now = new Date().toISOString()
      const joinInsert = await supabase.from('dice_player_seats').insert({
        session_id: sessionId,
        seat: nextSeat,
        user_id: user.userId,
        display_name: displayName,
        connected: true,
        is_ai: false,
        created_at: now,
        updated_at: now,
      })

      if (joinInsert.error) {
        throw joinInsert.error
      }
    }

    const sessionResult = await supabase
      .from('dice_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .single()

    if (sessionResult.error || !sessionResult.data) {
      sendJson(res, 404, {
        error: 'SESSION_NOT_FOUND',
      })
      return
    }

    const { data: seatsForInit, error: seatsForInitError } = await supabase
      .from('dice_player_seats')
      .select('seat, user_id, display_name, connected, is_ai')
      .eq('session_id', sessionId)
      .order('seat', { ascending: true })

    if (seatsForInitError) {
      throw seatsForInitError
    }

    if (sessionResult.data.status === 'lobby' && (seatsForInit?.length ?? 0) >= 2) {
      const humanNames = (seatsForInit ?? []).map((seat) => seat.display_name)
      const initializedState = createHotseatGameState(humanNames)

      const updateResult = await supabase
        .from('dice_sessions')
        .update({
          status: 'active',
          game_state: initializedState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (updateResult.error) {
        throw updateResult.error
      }
    }

    const refreshedSessionResult = await supabase
      .from('dice_sessions')
      .select('id, version, status, game_state, created_at, updated_at')
      .eq('id', sessionId)
      .single()

    if (!refreshedSessionResult.error && refreshedSessionResult.data && seatsForInit) {
      const snapshot = mapSessionSnapshot(
        refreshedSessionResult.data as SessionRow,
        seatsForInit as SeatRow[],
      )

      await publishSessionRealtimeEventBestEffort(sessionId, {
        type: 'PLAYER_JOINED',
        userId: user.userId,
        displayName,
      })

      await publishSessionRealtimeEventBestEffort(sessionId, {
        type: 'SESSION_SNAPSHOT',
        snapshot,
      })
    }

    sendJson(res, 200, {
      joined: true,
      sessionId,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'SESSION_JOIN_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
