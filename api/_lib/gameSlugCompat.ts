type SupabaseLikeError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

export type OnlineGameSlug = 'space-race' | 'voyage-home'

export const isVoyageHomeStateLike = (state: unknown): boolean => {
  if (!state || typeof state !== 'object') {
    return false
  }

  const candidate = state as {
    targetLeagues?: unknown
    suddenDeath?: unknown
    round?: unknown
  }

  return (
    typeof candidate.targetLeagues === 'number' &&
    typeof candidate.round === 'number' &&
    typeof candidate.suddenDeath === 'object'
  )
}

export const resolveSessionGameSlug = (session: {
  game_slug?: unknown
  game_state?: unknown
}): OnlineGameSlug => {
  if (session.game_slug === 'space-race' || session.game_slug === 'voyage-home') {
    return session.game_slug
  }

  return isVoyageHomeStateLike(session.game_state) ? 'voyage-home' : 'space-race'
}

export const isMissingGameSlugColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const typedError = error as SupabaseLikeError
  if (typedError.code === '42703' || String(typedError.code ?? '').toUpperCase() === 'PGRST204') {
    return true
  }

  const message = `${typedError.message ?? ''} ${typedError.details ?? ''} ${typedError.hint ?? ''}`.toLowerCase()
  return (
    message.includes('game_slug') &&
    (message.includes('schema cache') || message.includes('column') || message.includes('does not exist'))
  )
}
