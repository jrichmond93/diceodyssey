import type { SupabaseClient } from '@supabase/supabase-js'
import type { VerifiedUser } from './auth.js'
import { DEFAULT_PLAYER_AVATAR_KEY, resolvePlayerAvatarKey } from '../../src/multiplayer/avatarCatalog.js'

const DISALLOWED_DISPLAY_PATTERNS = [/\|/]

const trimAndCollapseWhitespace = (value: string): string => value.trim().replace(/\s+/g, ' ')

const normalizeDisplayName = (value: string): string => trimAndCollapseWhitespace(value).toLowerCase()

const sanitizeDisplayName = (value: string): string => {
  const collapsed = trimAndCollapseWhitespace(value)
  const stripped = collapsed.replace(/[^a-zA-Z0-9 _-]/g, '')
  return trimAndCollapseWhitespace(stripped)
}

const hashToBase36 = (value: string): string => {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash.toString(36).toUpperCase()
}

const buildPilotFallbackName = (userId: string): string => {
  const suffix = hashToBase36(userId).slice(0, 4).padEnd(4, 'X')
  return `Pilot-${suffix}`
}

const candidateLooksLikeProviderId = (candidate: string): boolean =>
  DISALLOWED_DISPLAY_PATTERNS.some((pattern) => pattern.test(candidate))

export const deriveDisplayName = (user: VerifiedUser): string => {
  const emailName = user.email?.split('@')[0] ?? ''

  const candidates = [
    user.name ?? '',
    user.nickname ?? '',
    emailName,
  ]

  for (const candidate of candidates) {
    const sanitized = sanitizeDisplayName(candidate)

    if (!sanitized || candidateLooksLikeProviderId(sanitized)) {
      continue
    }

    if (sanitized.length >= 3 && sanitized.length <= 24) {
      return sanitized
    }
  }

  return buildPilotFallbackName(user.userId)
}

interface ResolvedUserProfileIdentity {
  displayName: string
  avatarKey: string
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

export const resolveUserProfileIdentity = async (
  supabase: SupabaseClient,
  user: VerifiedUser,
): Promise<ResolvedUserProfileIdentity> => {
  const derivedDisplayName = deriveDisplayName(user)
  const defaultIdentity: ResolvedUserProfileIdentity = {
    displayName: derivedDisplayName,
    avatarKey: DEFAULT_PLAYER_AVATAR_KEY,
  }

  try {
    const existingProfileResult = await supabase
      .from('dice_player_profiles')
      .select('display_name, avatar_key')
      .eq('user_id', user.userId)
      .maybeSingle()

    if (!existingProfileResult.error && existingProfileResult.data?.display_name) {
      return {
        displayName: existingProfileResult.data.display_name as string,
        avatarKey: resolvePlayerAvatarKey(existingProfileResult.data.avatar_key as string | undefined),
      }
    }

    if (isMissingColumnError(existingProfileResult.error)) {
      const legacyProfileResult = await supabase
        .from('dice_player_profiles')
        .select('display_name')
        .eq('user_id', user.userId)
        .maybeSingle()

      if (!legacyProfileResult.error && legacyProfileResult.data?.display_name) {
        return {
          displayName: legacyProfileResult.data.display_name as string,
          avatarKey: DEFAULT_PLAYER_AVATAR_KEY,
        }
      }
    }

    const now = new Date().toISOString()

    const insertResult = await supabase
      .from('dice_player_profiles')
      .upsert(
        {
          user_id: user.userId,
          display_name: derivedDisplayName,
          display_name_normalized: normalizeDisplayName(derivedDisplayName),
          avatar_key: DEFAULT_PLAYER_AVATAR_KEY,
          updated_at: now,
        },
        { onConflict: 'user_id' },
      )
      .select('display_name, avatar_key')
      .single()

    if (!insertResult.error && insertResult.data?.display_name) {
      return {
        displayName: insertResult.data.display_name as string,
        avatarKey: resolvePlayerAvatarKey(insertResult.data.avatar_key as string | undefined),
      }
    }

    if (isMissingColumnError(insertResult.error)) {
      const legacyInsertResult = await supabase
        .from('dice_player_profiles')
        .upsert(
          {
            user_id: user.userId,
            display_name: derivedDisplayName,
            display_name_normalized: normalizeDisplayName(derivedDisplayName),
            updated_at: now,
          },
          { onConflict: 'user_id' },
        )
        .select('display_name')
        .single()

      if (!legacyInsertResult.error && legacyInsertResult.data?.display_name) {
        return {
          displayName: legacyInsertResult.data.display_name as string,
          avatarKey: DEFAULT_PLAYER_AVATAR_KEY,
        }
      }
    }
  } catch {
    return defaultIdentity
  }

  return defaultIdentity
}

export const resolveUserDisplayName = async (
  supabase: SupabaseClient,
  user: VerifiedUser,
): Promise<string> => {
  const identity = await resolveUserProfileIdentity(supabase, user)
  return identity.displayName
}

export const isDisplayNameAllowedByFormat = (value: string): boolean => {
  const sanitized = sanitizeDisplayName(value)
  if (!sanitized) {
    return false
  }

  if (sanitized.length < 3 || sanitized.length > 24) {
    return false
  }

  return /^[a-zA-Z0-9 _-]+$/.test(sanitized)
}

export const sanitizeUserProvidedDisplayName = (value: string): string => sanitizeDisplayName(value)
