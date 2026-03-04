import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'

interface ModerateBody {
  targetDisplayName?: string
  action?: 'BLOCK' | 'MUTE' | 'REPORT'
}

type SupabaseLikeError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

const normalizeDisplayName = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase()

const isMissingRelationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const typedError = error as SupabaseLikeError
  if (typedError.code === '42P01') {
    return true
  }

  const message = `${typedError.message ?? ''} ${typedError.details ?? ''} ${typedError.hint ?? ''}`.toLowerCase()
  return message.includes('relation') && message.includes('does not exist')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  const body = await readJsonBody<ModerateBody>(req)
  const targetDisplayName = (body.targetDisplayName ?? '').trim()
  const action = body.action

  if (!targetDisplayName || !action) {
    sendJson(res, 400, {
      error: 'INVALID_REQUEST',
    })
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()

    const targetProfileResult = await supabase
      .from('dice_player_profiles')
      .select('user_id, display_name')
      .eq('display_name_normalized', normalizeDisplayName(targetDisplayName))
      .maybeSingle()

    if (targetProfileResult.error) {
      throw targetProfileResult.error
    }

    const targetUserId = targetProfileResult.data?.user_id as string | undefined
    if (!targetUserId) {
      sendJson(res, 404, {
        error: 'PLAYER_NOT_FOUND',
      })
      return
    }

    if (targetUserId === user.userId) {
      sendJson(res, 400, {
        error: 'CANNOT_MODERATE_SELF',
      })
      return
    }

    const now = new Date().toISOString()

    if (action === 'BLOCK') {
      const existingEdgeResult = await supabase
        .from('dice_friend_edges')
        .select('requester_user_id, addressee_user_id, status')
        .eq('requester_user_id', user.userId)
        .eq('addressee_user_id', targetUserId)
        .maybeSingle()

      if (existingEdgeResult.error) {
        throw existingEdgeResult.error
      }

      if (existingEdgeResult.data) {
        const updateResult = await supabase
          .from('dice_friend_edges')
          .update({
            status: 'blocked',
            updated_at: now,
          })
          .eq('requester_user_id', user.userId)
          .eq('addressee_user_id', targetUserId)

        if (updateResult.error) {
          throw updateResult.error
        }
      } else {
        const insertResult = await supabase.from('dice_friend_edges').insert({
          requester_user_id: user.userId,
          addressee_user_id: targetUserId,
          status: 'blocked',
          created_at: now,
          updated_at: now,
        })

        if (insertResult.error) {
          throw insertResult.error
        }
      }

      sendJson(res, 200, {
        accepted: true,
        action: 'BLOCK',
        targetUserId,
      })
      return
    }

    const insertResult = await supabase.from('dice_social_moderation_actions').insert({
      actor_user_id: user.userId,
      target_user_id: targetUserId,
      action_type: action.toLowerCase(),
      created_at: now,
      metadata: {
        targetDisplayName,
      },
    })

    if (insertResult.error) {
      if (isMissingRelationError(insertResult.error)) {
        sendJson(res, 503, {
          error: 'MODERATION_STORAGE_UNAVAILABLE',
          detail: 'Apply docs/sql/multiplayer-presence-moderation-v1.sql and retry.',
        })
        return
      }

      throw insertResult.error
    }

    sendJson(res, 200, {
      accepted: true,
      action,
      targetUserId,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'MODERATION_REQUEST_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
