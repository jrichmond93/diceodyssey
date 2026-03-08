import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from './_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from './_lib/http.js'
import { getSupabaseAdminClient } from './_lib/supabase.js'
import {
  isDisplayNameAllowedByFormat,
  resolveUserProfileIdentity,
  sanitizeUserProvidedDisplayName,
} from './_lib/displayName.js'
import {
  DEFAULT_PLAYER_AVATAR_KEY,
  isValidPlayerAvatarKey,
  resolvePlayerAvatarKey,
} from '../src/multiplayer/avatarCatalog.js'

interface ProfileBody {
  displayName?: string
  avatarKey?: string
}

interface ExistingProfileRow {
  display_name: string | null
  avatar_key?: string | null
  updated_at?: string | null
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
      const existingProfileResult = await supabase
        .from('dice_player_profiles')
        .select('display_name, avatar_key, updated_at')
        .eq('user_id', user.userId)
        .maybeSingle()

      let existingProfile: ExistingProfileRow | null = existingProfileResult.data as ExistingProfileRow | null
      let existingProfileError = existingProfileResult.error

      if (isMissingColumnError(existingProfileResult.error)) {
        const legacyResult = await supabase
          .from('dice_player_profiles')
          .select('display_name, updated_at')
          .eq('user_id', user.userId)
          .maybeSingle()

        existingProfile = legacyResult.data as ExistingProfileRow | null
        existingProfileError = legacyResult.error
      }

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
            avatarKey: resolvePlayerAvatarKey(existingProfile.avatar_key as string | undefined),
            updatedAt: existingProfile.updated_at,
          },
        })
        return
      }

      const identity = await resolveUserProfileIdentity(supabase, user)

      sendJson(res, 200, {
        profile: {
          userId: user.userId,
          displayName: identity.displayName,
          avatarKey: identity.avatarKey,
        },
      })
      return
    }

    const body = await readJsonBody<ProfileBody>(req)
    const sanitizedDisplayName = sanitizeUserProvidedDisplayName(body.displayName ?? '')
    const requestedAvatarKey = (body.avatarKey ?? '').trim()
    const avatarKey = requestedAvatarKey ? resolvePlayerAvatarKey(requestedAvatarKey) : DEFAULT_PLAYER_AVATAR_KEY

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

    if (requestedAvatarKey && !isValidPlayerAvatarKey(requestedAvatarKey)) {
      sendJson(res, 400, {
        error: 'AVATAR_NOT_ALLOWED',
        detail: 'Avatar key is invalid. Select one of the predefined avatars.',
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
          avatar_key: avatarKey,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('display_name, avatar_key, updated_at')
      .single()

    if (updatedProfile.error || !updatedProfile.data) {
      if (isMissingRelationError(updatedProfile.error)) {
        sendJson(res, 503, {
          error: 'PROFILE_STORAGE_UNAVAILABLE',
          detail: 'Profile storage is not ready. Apply docs/sql/multiplayer-match-discovery-supabase.sql and retry.',
        })
        return
      }

      if (isMissingColumnError(updatedProfile.error)) {
        sendJson(res, 503, {
          error: 'PROFILE_STORAGE_UNAVAILABLE',
          detail: 'Profile avatar storage is not ready. Apply docs/sql/multiplayer-avatar-v1.sql and retry.',
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
        avatarKey: resolvePlayerAvatarKey(updatedProfile.data.avatar_key as string | undefined),
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
