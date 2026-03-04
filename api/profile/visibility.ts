import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'
import { resolveUserProfileIdentity } from '../_lib/displayName.js'

type PresenceVisibility = 'discoverable' | 'friends-only' | 'private'

interface VisibilityBody {
  visibility?: PresenceVisibility
}

type SupabaseLikeError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

const isMissingColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const typedError = error as SupabaseLikeError
  if (typedError.code === '42703') {
    return true
  }

  const message = `${typedError.message ?? ''} ${typedError.details ?? ''} ${typedError.hint ?? ''}`.toLowerCase()
  return message.includes('column') && message.includes('does not exist')
}

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

const isValidVisibility = (value: unknown): value is PresenceVisibility =>
  value === 'discoverable' || value === 'friends-only' || value === 'private'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    methodNotAllowed(req, res)
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()

    if (req.method === 'GET') {
      const profileResult = await supabase
        .from('dice_player_profiles')
        .select('presence_visibility')
        .eq('user_id', user.userId)
        .maybeSingle()

      if (profileResult.error) {
        if (isMissingColumnError(profileResult.error) || isMissingRelationError(profileResult.error)) {
          sendJson(res, 200, {
            visibility: 'discoverable',
          })
          return
        }

        throw profileResult.error
      }

      const visibilityCandidate = profileResult.data?.presence_visibility
      sendJson(res, 200, {
        visibility: isValidVisibility(visibilityCandidate) ? visibilityCandidate : 'discoverable',
      })
      return
    }

    const body = await readJsonBody<VisibilityBody>(req)
    if (!isValidVisibility(body.visibility)) {
      sendJson(res, 400, {
        error: 'INVALID_VISIBILITY',
      })
      return
    }

    await resolveUserProfileIdentity(supabase, user)

    const updateResult = await supabase
      .from('dice_player_profiles')
      .update({
        presence_visibility: body.visibility,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.userId)

    if (updateResult.error) {
      if (isMissingColumnError(updateResult.error) || isMissingRelationError(updateResult.error)) {
        sendJson(res, 503, {
          error: 'PROFILE_VISIBILITY_STORAGE_UNAVAILABLE',
          detail: 'Apply docs/sql/multiplayer-presence-moderation-v1.sql and retry.',
        })
        return
      }

      throw updateResult.error
    }

    sendJson(res, 200, {
      updated: true,
      visibility: body.visibility,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'PROFILE_VISIBILITY_REQUEST_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
