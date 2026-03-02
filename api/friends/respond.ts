import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'

interface FriendRespondBody {
  requesterUserId?: string
  action?: 'ACCEPT' | 'DECLINE' | 'BLOCK'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  const body = await readJsonBody<FriendRespondBody>(req)
  const requesterUserId = (body.requesterUserId ?? '').trim()
  const action = body.action

  if (!requesterUserId || !action) {
    sendJson(res, 400, {
      error: 'INVALID_REQUEST',
    })
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()

    const { data: existing, error: existingError } = await supabase
      .from('dice_friend_edges')
      .select('requester_user_id, addressee_user_id, status')
      .eq('requester_user_id', requesterUserId)
      .eq('addressee_user_id', user.userId)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    if (!existing) {
      sendJson(res, 404, {
        error: 'REQUEST_NOT_FOUND',
      })
      return
    }

    const now = new Date().toISOString()

    if (action === 'DECLINE') {
      const deleteResult = await supabase
        .from('dice_friend_edges')
        .delete()
        .eq('requester_user_id', requesterUserId)
        .eq('addressee_user_id', user.userId)

      if (deleteResult.error) {
        throw deleteResult.error
      }

      sendJson(res, 200, {
        updated: true,
        status: 'declined',
      })
      return
    }

    const status = action === 'ACCEPT' ? 'accepted' : 'blocked'

    const updateResult = await supabase
      .from('dice_friend_edges')
      .update({
        status,
        updated_at: now,
      })
      .eq('requester_user_id', requesterUserId)
      .eq('addressee_user_id', user.userId)

    if (updateResult.error) {
      throw updateResult.error
    }

    sendJson(res, 200, {
      updated: true,
      status,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'FRIEND_RESPONSE_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
