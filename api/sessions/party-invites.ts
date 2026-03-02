import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    methodNotAllowed(req, res)
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()

    const invitesResult = await supabase
      .from('dice_party_invites')
      .select('id, session_id, from_user_id, to_user_id, status, expires_at, created_at, updated_at')

    if (invitesResult.error) {
      throw invitesResult.error
    }

    const now = Date.now()
    const invites = invitesResult.data ?? []

    const profilesResult = await supabase
      .from('dice_player_profiles')
      .select('user_id, display_name')

    if (profilesResult.error) {
      throw profilesResult.error
    }

    const displayNameByUserId = new Map<string, string>()
    ;(profilesResult.data ?? []).forEach((row) => {
      const profileUserId = row.user_id as string | undefined
      const displayName = row.display_name as string | undefined
      if (profileUserId && displayName) {
        displayNameByUserId.set(profileUserId, displayName)
      }
    })

    const received = invites
      .filter((invite) => invite.to_user_id === user.userId)
      .map((invite) => ({
        id: invite.id,
        sessionId: invite.session_id,
        fromUserId: invite.from_user_id,
        fromDisplayName:
          displayNameByUserId.get(invite.from_user_id as string) ??
          `Pilot-${String(invite.from_user_id ?? '').slice(-4).toUpperCase()}`,
        status:
          invite.status === 'pending' && new Date(invite.expires_at as string).getTime() <= now
            ? 'expired'
            : invite.status,
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
      }))

    const sent = invites
      .filter((invite) => invite.from_user_id === user.userId)
      .map((invite) => ({
        id: invite.id,
        sessionId: invite.session_id,
        toUserId: invite.to_user_id,
        toDisplayName:
          displayNameByUserId.get(invite.to_user_id as string) ??
          `Pilot-${String(invite.to_user_id ?? '').slice(-4).toUpperCase()}`,
        status:
          invite.status === 'pending' && new Date(invite.expires_at as string).getTime() <= now
            ? 'expired'
            : invite.status,
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
      }))

    sendJson(res, 200, {
      received,
      sent,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'PARTY_INVITES_REQUEST_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
