import type { MultiplayerIdentity } from './types'

export interface AuthUserProfile {
  sub?: string
  name?: string
  nickname?: string
  email?: string
}

export type MultiplayerEligibilityReason = 'AUTH_LOADING' | 'UNAUTHENTICATED'

export interface MultiplayerEligibility {
  eligible: boolean
  reason?: MultiplayerEligibilityReason
}

export const getMultiplayerEligibility = (
  isAuthenticated: boolean,
  isAuthLoading: boolean,
): MultiplayerEligibility => {
  if (isAuthLoading) {
    return {
      eligible: false,
      reason: 'AUTH_LOADING',
    }
  }

  if (!isAuthenticated) {
    return {
      eligible: false,
      reason: 'UNAUTHENTICATED',
    }
  }

  return {
    eligible: true,
  }
}

export const mapAuthUserToMultiplayerIdentity = (
  user: AuthUserProfile | null | undefined,
): MultiplayerIdentity | null => {
  if (!user?.sub) {
    return null
  }

  const emailName = user.email?.split('@')[0]?.trim()
  const displayName = user.name?.trim() || user.nickname?.trim() || emailName || 'Pilot'

  return {
    userId: user.sub,
    displayName,
  }
}
