import type { SupabaseClient } from '@supabase/supabase-js'
import type { VerifiedUser } from './auth.js'

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

export const resolveUserDisplayName = async (
  supabase: SupabaseClient,
  user: VerifiedUser,
): Promise<string> => {
  const derived = deriveDisplayName(user)

  try {
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('dice_player_profiles')
      .select('display_name')
      .eq('user_id', user.userId)
      .maybeSingle()

    if (!existingProfileError && existingProfile?.display_name) {
      return existingProfile.display_name as string
    }

    const { data: inserted, error: insertError } = await supabase
      .from('dice_player_profiles')
      .upsert(
        {
          user_id: user.userId,
          display_name: derived,
          display_name_normalized: normalizeDisplayName(derived),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('display_name')
      .single()

    if (!insertError && inserted?.display_name) {
      return inserted.display_name as string
    }
  } catch {
    return derived
  }

  return derived
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
