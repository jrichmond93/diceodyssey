import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'

interface RevokeInviteCodeBody {
  sessionId?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  sendJson(res, 410, {
    error: 'DIRECT_MATCH_DISABLED',
  })
  return

  const body = await readJsonBody<RevokeInviteCodeBody>(req)
  const sessionId = (body.sessionId ?? '').trim()

  if (!sessionId) {
    sendJson(res, 400, {
      error: 'INVALID_SESSION_ID',
    })
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()

    const { data: seat, error: seatError } = await supabase
      .from('dice_player_seats')
      .select('seat')
      .eq('session_id', sessionId)
      .eq('user_id', user.userId)
      .maybeSingle()

    if (seatError) {
      throw seatError
    }

    if (!seat) {
      sendJson(res, 403, {
        error: 'NOT_IN_SESSION',
      })
      return
    }

    const revokeResult = await supabase
      .from('dice_match_invites')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .eq('created_by_user_id', user.userId)
      .select('id')

    if (revokeResult.error) {
      throw revokeResult.error
    }

    sendJson(res, 200, {
      sessionId,
      revokedCount: revokeResult.data?.length ?? 0,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'INVITE_CODE_REVOKE_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
