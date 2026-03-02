import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from './_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from './_lib/http.js'
import { getSupabaseAdminClient } from './_lib/supabase.js'
import {
  isDisplayNameAllowedByFormat,
  resolveUserDisplayName,
  sanitizeUserProvidedDisplayName,
} from './_lib/displayName.js'

interface ProfileBody {
  displayName?: string
}

type SupabaseLikeError = {
  code?: string
  message?: string
  details?: string
  hint?: string
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

const isUniqueViolationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const typedError = error as SupabaseLikeError
  if (typedError.code === '23505') {
    return true
  }

  const message = `${typedError.message ?? ''} ${typedError.details ?? ''} ${typedError.hint ?? ''}`.toLowerCase()
  return message.includes('duplicate key') || message.includes('unique constraint')
}

const containsBlockedTerm = (displayName: string, terms: string[]): boolean => {
  const normalized = displayName.toLowerCase()
  return terms.some((term) => normalized.includes(term.toLowerCase()))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    methodNotAllowed(req, res)
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()

    if (req.method === 'GET') {
      const { data: existingProfile, error: existingProfileError } = await supabase
        .from('dice_player_profiles')
        .select('display_name, avatar_url, updated_at')
        .eq('user_id', user.userId)
        .maybeSingle()

      if (existingProfileError) {
        if (!isMissingRelationError(existingProfileError)) {
          throw existingProfileError
        }
      }

      if (existingProfile) {
        sendJson(res, 200, {
          profile: {
            userId: user.userId,
            displayName: existingProfile.display_name,
            avatarUrl: existingProfile.avatar_url,
            updatedAt: existingProfile.updated_at,
          },
        })
        return
      }

      const displayName = await resolveUserDisplayName(supabase, user)

      sendJson(res, 200, {
        profile: {
          userId: user.userId,
          displayName,
          avatarUrl: null,
        },
      })
      return
    }

    const body = await readJsonBody<ProfileBody>(req)
    const sanitizedDisplayName = sanitizeUserProvidedDisplayName(body.displayName ?? '')

    if (!isDisplayNameAllowedByFormat(sanitizedDisplayName)) {
      sendJson(res, 400, {
        error: 'DISPLAY_NAME_NOT_ALLOWED',
        detail: 'Display name must be 3-24 chars and contain only letters, numbers, spaces, _ or -.',
      })
      return
    }

    const blockedTermsResult = await supabase
      .from('dice_blocked_terms')
      .select('term')
      .eq('is_active', true)

    if (blockedTermsResult.error) {
      if (!isMissingRelationError(blockedTermsResult.error)) {
        throw blockedTermsResult.error
      }
    }

    const blockedTerms = (blockedTermsResult.data ?? [])
      .map((row) => (row.term as string | undefined)?.trim())
      .filter((value): value is string => Boolean(value))

    if (containsBlockedTerm(sanitizedDisplayName, blockedTerms)) {
      sendJson(res, 400, {
        error: 'DISPLAY_NAME_NOT_ALLOWED',
        detail: 'Display name contains blocked language.',
      })
      return
    }

    const updatedProfile = await supabase
      .from('dice_player_profiles')
      .upsert(
        {
          user_id: user.userId,
          display_name: sanitizedDisplayName,
          display_name_normalized: sanitizedDisplayName.toLowerCase(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('display_name, avatar_url, updated_at')
      .single()

    if (updatedProfile.error || !updatedProfile.data) {
      if (isMissingRelationError(updatedProfile.error)) {
        sendJson(res, 503, {
          error: 'PROFILE_STORAGE_UNAVAILABLE',
          detail: 'Profile storage is not ready. Apply docs/sql/multiplayer-match-discovery-supabase.sql and retry.',
        })
        return
      }

      if (isUniqueViolationError(updatedProfile.error)) {
        sendJson(res, 409, {
          error: 'DISPLAY_NAME_TAKEN',
          detail: 'Display name is already in use. Try a different name.',
        })
        return
      }

      throw updatedProfile.error ?? new Error('PROFILE_UPDATE_FAILED')
    }

    sendJson(res, 200, {
      profile: {
        userId: user.userId,
        displayName: updatedProfile.data.display_name,
        avatarUrl: updatedProfile.data.avatar_url,
        updatedAt: updatedProfile.data.updated_at,
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
      error: 'PROFILE_REQUEST_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
