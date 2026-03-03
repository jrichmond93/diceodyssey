import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../../_lib/http.js'
import { getSupabaseAdminClient } from '../../_lib/supabase.js'
import { publishSessionRealtimeEventBestEffort } from '../../_lib/realtime.js'
import { createHotseatGameState } from '../../_lib/serverGameState.js'
import { mapSessionSnapshot, type SeatRow, type SessionRow } from '../../_lib/sessionSnapshot.js'
import { resolveUserProfileIdentity } from '../../_lib/displayName.js'

interface PartyInviteRespondBody {
  inviteId?: string
  action?: 'ACCEPT' | 'DECLINE'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  const body = await readJsonBody<PartyInviteRespondBody>(req)
  const inviteId = (body.inviteId ?? '').trim()
  const action = body.action

  if (!inviteId || !action) {
    sendJson(res, 400, {
      error: 'INVALID_REQUEST',
    })
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()

    const inviteResult = await supabase
      .from('dice_party_invites')
      .select('id, session_id, from_user_id, to_user_id, status, expires_at')
      .eq('id', inviteId)
      .eq('to_user_id', user.userId)
      .maybeSingle()

    if (inviteResult.error) {
      throw inviteResult.error
    }

    if (!inviteResult.data) {
      sendJson(res, 404, {
        error: 'INVITE_NOT_FOUND',
      })
      return
    }

    const invite = inviteResult.data
    if (invite.status !== 'pending') {
      sendJson(res, 409, {
        error: 'INVITE_NOT_ACTIVE',
      })
      return
    }

    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      await supabase
        .from('dice_party_invites')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('id', inviteId)

      sendJson(res, 410, {
        error: 'INVITE_EXPIRED',
      })
      return
    }

    if (action === 'DECLINE') {
      const declineResult = await supabase
        .from('dice_party_invites')
        .update({
          status: 'declined',
          updated_at: new Date().toISOString(),
        })
        .eq('id', inviteId)

      if (declineResult.error) {
        throw declineResult.error
      }

      sendJson(res, 200, {
        accepted: false,
        status: 'declined',
      })
      return
    }

    const sessionId = invite.session_id as string

    const sessionResult = await supabase
      .from('dice_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionResult.error) {
      throw sessionResult.error
    }

    if (!sessionResult.data || sessionResult.data.status === 'finished' || sessionResult.data.status === 'abandoned') {
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

    const identity = await resolveUserProfileIdentity(supabase, user)

    if (!existingSeat) {
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

    const inviteUpdate = await supabase
      .from('dice_party_invites')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', inviteId)

    if (inviteUpdate.error) {
      throw inviteUpdate.error
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
        accepted: true,
        sessionId,
        snapshot,
      })
      return
    }

    sendJson(res, 200, {
      accepted: true,
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
      error: 'PARTY_INVITE_RESPONSE_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
