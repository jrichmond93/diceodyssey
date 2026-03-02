import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'
import { publishSessionRealtimeEventBestEffort } from '../_lib/realtime.js'
import { initialGameState } from '../_lib/initialGameState.js'

const getErrorDetail = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: string
      detail?: string
      hint?: string
      code?: string
      error_description?: string
    }

    return (
      candidate.message ||
      candidate.detail ||
      candidate.hint ||
      candidate.error_description ||
      candidate.code ||
      JSON.stringify(error)
    )
  }

  return String(error)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()

    const sessionId = crypto.randomUUID()
    const now = new Date().toISOString()

    const sessionInsert = await supabase.from('dice_sessions').insert({
      id: sessionId,
      status: 'lobby',
      version: 1,
      game_state: initialGameState,
      created_at: now,
      updated_at: now,
    })

    if (sessionInsert.error) {
      throw sessionInsert.error
    }

    const seatInsert = await supabase.from('dice_player_seats').insert({
      session_id: sessionId,
      seat: 1,
      user_id: user.userId,
      display_name: user.userId,
      connected: true,
      is_ai: false,
      created_at: now,
      updated_at: now,
    })

    if (seatInsert.error) {
      throw seatInsert.error
    }

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'MATCH_FOUND',
      sessionId,
    })

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'PLAYER_JOINED',
      userId: user.userId,
      displayName: user.userId,
    })

    sendJson(res, 200, {
      matchFound: true,
      sessionId,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    const detail = getErrorDetail(error)
    console.error('QUEUE_FAILED', { detail })

    sendJson(res, 500, {
      error: 'QUEUE_FAILED',
      detail,
    })
  }
}
