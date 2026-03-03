import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'
import { mapSessionSnapshot, type SeatRow, type SessionRow } from '../_lib/sessionSnapshot.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
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
    await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()

    const sessionResult = await supabase
      .from('dice_sessions')
      .select('id, version, status, game_state, created_at, updated_at')
      .eq('id', sessionId)
      .single()

    if (sessionResult.error || !sessionResult.data) {
      sendJson(res, 404, {
        error: 'SESSION_NOT_FOUND',
      })
      return
    }

    const seatResult = await supabase
      .from('dice_player_seats')
      .select('seat, user_id, display_name, avatar_key, connected, is_ai')
      .eq('session_id', sessionId)
      .order('seat', { ascending: true })

    if (seatResult.error) {
      throw seatResult.error
    }

    sendJson(res, 200, {
      snapshot: mapSessionSnapshot(sessionResult.data as SessionRow, (seatResult.data ?? []) as SeatRow[]),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'SESSION_REQUEST_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
