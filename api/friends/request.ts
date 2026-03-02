import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'

interface FriendRequestBody {
  targetDisplayName?: string
}

const normalizeDisplayName = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  const body = await readJsonBody<FriendRequestBody>(req)
  const targetDisplayName = (body.targetDisplayName ?? '').trim()
  const normalizedTargetDisplayName = normalizeDisplayName(targetDisplayName)

  if (!normalizedTargetDisplayName) {
    sendJson(res, 400, {
      error: 'INVALID_TARGET_DISPLAY_NAME',
    })
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()

    const targetProfileResult = normalizedTargetDisplayName
      ? await supabase
          .from('dice_player_profiles')
          .select('user_id, display_name')
          .eq('display_name_normalized', normalizedTargetDisplayName)
          .maybeSingle()
      : { data: null, error: null }

    if (targetProfileResult.error) {
      throw targetProfileResult.error
    }

    const targetUserId = targetProfileResult.data?.user_id as string | undefined
    const resolvedDisplayName =
      (targetProfileResult.data?.display_name as string | undefined) ??
      targetDisplayName

    if (!targetUserId) {
      sendJson(res, 404, {
        error: 'PLAYER_NOT_FOUND',
      })
      return
    }

    if (targetUserId === user.userId) {
      sendJson(res, 400, {
        error: 'CANNOT_FRIEND_SELF',
      })
      return
    }

    const { data: edges, error: edgeError } = await supabase
      .from('dice_friend_edges')
      .select('requester_user_id, addressee_user_id, status')

    if (edgeError) {
      throw edgeError
    }

    const relevantEdges = (edges ?? []).filter((row) => {
      const requester = row.requester_user_id as string | undefined
      const addressee = row.addressee_user_id as string | undefined

      return (
        (requester === user.userId && addressee === targetUserId) ||
        (requester === targetUserId && addressee === user.userId)
      )
    })

    const existingAccepted = relevantEdges.find((row) => row.status === 'accepted')
    if (existingAccepted) {
      sendJson(res, 409, {
        error: 'ALREADY_FRIENDS',
      })
      return
    }

    const existingBlocked = relevantEdges.find((row) => row.status === 'blocked')
    if (existingBlocked) {
      sendJson(res, 403, {
        error: 'FRIEND_BLOCKED',
      })
      return
    }

    const reversePending = relevantEdges.find(
      (row) =>
        row.requester_user_id === targetUserId &&
        row.addressee_user_id === user.userId &&
        row.status === 'pending',
    )

    if (reversePending) {
      const now = new Date().toISOString()
      const updateResult = await supabase
        .from('dice_friend_edges')
        .update({
          status: 'accepted',
          updated_at: now,
        })
        .eq('requester_user_id', targetUserId)
        .eq('addressee_user_id', user.userId)

      if (updateResult.error) {
        throw updateResult.error
      }

      sendJson(res, 200, {
        requested: true,
        status: 'accepted',
        userId: targetUserId,
        displayName: resolvedDisplayName,
      })
      return
    }

    const outgoingPending = relevantEdges.find(
      (row) =>
        row.requester_user_id === user.userId &&
        row.addressee_user_id === targetUserId &&
        row.status === 'pending',
    )

    if (outgoingPending) {
      sendJson(res, 409, {
        error: 'REQUEST_ALREADY_PENDING',
      })
      return
    }

    const now = new Date().toISOString()
    const insertResult = await supabase.from('dice_friend_edges').insert({
      requester_user_id: user.userId,
      addressee_user_id: targetUserId,
      status: 'pending',
      created_at: now,
      updated_at: now,
    })

    if (insertResult.error) {
      throw insertResult.error
    }

    sendJson(res, 200, {
      requested: true,
      status: 'pending',
      userId: targetUserId,
      displayName: resolvedDisplayName,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'FRIEND_REQUEST_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
