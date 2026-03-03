import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'
import { publishSessionRealtimeEventBestEffort } from '../_lib/realtime.js'
import { mapSessionSnapshot, type SeatRow, type SessionRow } from '../_lib/sessionSnapshot.js'
import { createHotseatGameState } from '../_lib/serverGameState.js'
import { resolveUserProfileIdentity } from '../_lib/displayName.js'

interface JoinByCodeBody {
  code?: string
}

const normalizeCode = (value: string): string => value.trim().toLowerCase()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  const body = await readJsonBody<JoinByCodeBody>(req)
  const code = normalizeCode(body.code ?? '')

  if (!code) {
    sendJson(res, 400, {
      error: 'INVALID_CODE',
    })
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()
    const identity = await resolveUserProfileIdentity(supabase, user)

    const inviteResult = await supabase
      .from('dice_match_invites')
      .select('id, session_id, status, expires_at')
      .eq('code', code)
      .maybeSingle()

    if (inviteResult.error) {
      throw inviteResult.error
    }

    if (!inviteResult.data) {
      sendJson(res, 404, {
        error: 'INVALID_CODE',
      })
      return
    }

    const invite = inviteResult.data

    if (invite.status !== 'active') {
      sendJson(res, 409, {
        error: 'INVALID_CODE',
      })
      return
    }

    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      await supabase
        .from('dice_match_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)

      sendJson(res, 410, {
        error: 'EXPIRED_CODE',
      })
      return
    }

    const sessionId = invite.session_id as string

    const sessionResult = await supabase
      .from('dice_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .single()

    if (sessionResult.error || !sessionResult.data) {
      sendJson(res, 404, {
        error: 'MATCH_CLOSED',
      })
      return
    }

    if (sessionResult.data.status === 'finished' || sessionResult.data.status === 'abandoned') {
      sendJson(res, 409, {
        error: 'MATCH_CLOSED',
      })
      return
    }

    const { data: existingSeat, error: existingSeatError } = await supabase
      .from('dice_player_seats')
      .select('seat, user_id')
      .eq('session_id', sessionId)
      .eq('user_id', user.userId)
      .maybeSingle()

    if (existingSeatError) {
      throw existingSeatError
    }

    if (existingSeat) {
      sendJson(res, 409, {
        error: 'ALREADY_IN_SESSION',
        sessionId,
      })
      return
    }

    const { data: seatRows, error: seatRowsError } = await supabase
      .from('dice_player_seats')
      .select('seat')
      .eq('session_id', sessionId)
      .order('seat', { ascending: true })

    if (seatRowsError) {
      throw seatRowsError
    }

    if ((seatRows?.length ?? 0) >= 2) {
      sendJson(res, 409, {
        error: 'MATCH_FULL',
      })
      return
    }

    const nextSeat = Math.max(0, ...(seatRows ?? []).map((row) => row.seat)) + 1
    const now = new Date().toISOString()

    const insertSeat = await supabase.from('dice_player_seats').insert({
      session_id: sessionId,
      seat: nextSeat,
      user_id: user.userId,
      display_name: identity.displayName,
      avatar_key: identity.avatarKey,
      connected: true,
      is_ai: false,
      created_at: now,
      updated_at: now,
    })

    if (insertSeat.error) {
      throw insertSeat.error
    }

    const { data: seatsForInit, error: seatsForInitError } = await supabase
      .from('dice_player_seats')
      .select('seat, user_id, display_name, avatar_key, connected, is_ai')
      .eq('session_id', sessionId)
      .order('seat', { ascending: true })

    if (seatsForInitError) {
      throw seatsForInitError
    }

    if (sessionResult.data.status === 'lobby' && (seatsForInit?.length ?? 0) >= 2) {
      const humanNames = (seatsForInit ?? []).map((seat) => seat.display_name)
      const initializedState = createHotseatGameState(humanNames)

      const updateSession = await supabase
        .from('dice_sessions')
        .update({
          status: 'active',
          game_state: initializedState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (updateSession.error) {
        throw updateSession.error
      }
    }

    if ((seatsForInit?.length ?? 0) >= 2) {
      await supabase
        .from('dice_match_invites')
        .update({
          status: 'consumed',
          consumed_by_user_id: user.userId,
          consumed_at: new Date().toISOString(),
        })
        .eq('id', invite.id)
        .eq('status', 'active')
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
        displayName: identity.displayName,
        avatarKey: identity.avatarKey,
      })

      await publishSessionRealtimeEventBestEffort(sessionId, {
        type: 'SESSION_SNAPSHOT',
        snapshot,
      })

      sendJson(res, 200, {
        joined: true,
        sessionId,
        snapshot,
      })
      return
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
      error: 'JOIN_BY_CODE_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
