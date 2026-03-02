import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'

interface PartyInviteBody {
  sessionId?: string
  toUserId?: string
  ttlMinutes?: number
}

const DEFAULT_TTL_MINUTES = 30

const hasAcceptedFriendship = (
  edges: Array<{ requester_user_id?: unknown; addressee_user_id?: unknown; status?: unknown }>,
  userA: string,
  userB: string,
): boolean => {
  return edges.some((edge) => {
    if (edge.status !== 'accepted') {
      return false
    }

    const requester = edge.requester_user_id
    const addressee = edge.addressee_user_id

    return (
      (requester === userA && addressee === userB) ||
      (requester === userB && addressee === userA)
    )
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  const body = await readJsonBody<PartyInviteBody>(req)
  const sessionId = (body.sessionId ?? '').trim()
  const toUserId = (body.toUserId ?? '').trim()

  if (!sessionId || !toUserId) {
    sendJson(res, 400, {
      error: 'INVALID_REQUEST',
    })
    return
  }

  try {
    const user = await verifyRequestUser(req)

    if (toUserId === user.userId) {
      sendJson(res, 400, {
        error: 'INVALID_TARGET_USER',
      })
      return
    }

    const supabase = getSupabaseAdminClient()

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

    const hostSeatResult = await supabase
      .from('dice_player_seats')
      .select('seat')
      .eq('session_id', sessionId)
      .eq('user_id', user.userId)
      .maybeSingle()

    if (hostSeatResult.error) {
      throw hostSeatResult.error
    }

    if (!hostSeatResult.data) {
      sendJson(res, 403, {
        error: 'NOT_IN_SESSION',
      })
      return
    }

    const targetSeatResult = await supabase
      .from('dice_player_seats')
      .select('seat')
      .eq('session_id', sessionId)
      .eq('user_id', toUserId)
      .maybeSingle()

    if (targetSeatResult.error) {
      throw targetSeatResult.error
    }

    if (targetSeatResult.data) {
      sendJson(res, 409, {
        error: 'ALREADY_IN_SESSION',
      })
      return
    }

    const edgesResult = await supabase
      .from('dice_friend_edges')
      .select('requester_user_id, addressee_user_id, status')

    if (edgesResult.error) {
      throw edgesResult.error
    }

    if (!hasAcceptedFriendship(edgesResult.data ?? [], user.userId, toUserId)) {
      sendJson(res, 403, {
        error: 'FRIEND_REQUIRED',
      })
      return
    }

    const now = new Date()
    const ttlMinutes = Number.isFinite(body.ttlMinutes) && (body.ttlMinutes ?? 0) > 0 ? (body.ttlMinutes as number) : DEFAULT_TTL_MINUTES
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString()

    await supabase
      .from('dice_party_invites')
      .update({
        status: 'expired',
        updated_at: now.toISOString(),
      })
      .eq('session_id', sessionId)
      .eq('to_user_id', toUserId)
      .eq('status', 'pending')
      .lte('expires_at', now.toISOString())

    const insertResult = await supabase
      .from('dice_party_invites')
      .insert({
        id: crypto.randomUUID(),
        session_id: sessionId,
        from_user_id: user.userId,
        to_user_id: toUserId,
        status: 'pending',
        expires_at: expiresAt,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select('id, session_id, from_user_id, to_user_id, status, expires_at')
      .single()

    if (insertResult.error || !insertResult.data) {
      throw insertResult.error ?? new Error('PARTY_INVITE_CREATE_FAILED')
    }

    sendJson(res, 200, {
      invite: {
        id: insertResult.data.id,
        sessionId: insertResult.data.session_id,
        fromUserId: insertResult.data.from_user_id,
        toUserId: insertResult.data.to_user_id,
        status: insertResult.data.status,
        expiresAt: insertResult.data.expires_at,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'PARTY_INVITE_CREATE_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
