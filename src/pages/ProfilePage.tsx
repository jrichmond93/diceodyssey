import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Link } from 'react-router-dom'
import { getAuth0EnvConfig } from '../multiplayer/env'
import {
  getMultiplayerEligibility,
  mapAuthUserToMultiplayerIdentity,
  type AuthUserProfile,
} from '../multiplayer/auth'
import {
  getPlayerAvatarSrc,
  getPlayerAvatarOption,
  PLAYER_AVATAR_FALLBACK_SRC,
  PLAYER_AVATAR_OPTIONS,
  resolvePlayerAvatarKey,
} from '../multiplayer/avatarCatalog'

interface ProfilePayload {
  profile?: {
    userId: string
    displayName: string
    avatarKey?: string | null
    updatedAt?: string
  }
}

const withAvatarFallback = (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget
  if (image.src.endsWith(PLAYER_AVATAR_FALLBACK_SRC)) {
    return
  }

  image.src = PLAYER_AVATAR_FALLBACK_SRC
}

interface ProfilePageProps {
  animationEnabled: boolean
  onAnimationEnabledChange: (enabled: boolean) => void
}

const buildApiError = async (response: Response, fallback: string): Promise<string> => {
  const raw = await response.text().catch(() => '')

  if (!raw) {
    return `${fallback} (${response.status})`
  }

  try {
    const parsed = JSON.parse(raw) as { error?: string; detail?: string }
    return parsed.detail ?? parsed.error ?? `${fallback} (${response.status})`
  } catch {
    return `${fallback} (${response.status}): ${raw}`
  }
}

export function ProfilePage({ animationEnabled, onAnimationEnabledChange }: ProfilePageProps) {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()
  const [displayName, setDisplayName] = useState('')
  const [avatarKey, setAvatarKey] = useState(resolvePlayerAvatarKey(undefined))
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  const multiplayerIdentity = useMemo(
    () => mapAuthUserToMultiplayerIdentity((user ?? null) as AuthUserProfile | null),
    [user],
  )

  const multiplayerEligibility = useMemo(
    () => getMultiplayerEligibility(isAuthenticated, isLoading),
    [isAuthenticated, isLoading],
  )

  const auth0Audience = useMemo(() => {
    try {
      return getAuth0EnvConfig().audience
    } catch {
      return undefined
    }
  }, [])

  const getApiAccessToken = useCallback(async () => {
    return getAccessTokenSilently(
      auth0Audience
        ? {
            authorizationParams: {
              audience: auth0Audience,
            },
          }
        : undefined,
    )
  }, [auth0Audience, getAccessTokenSilently])

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) {
      return
    }

    try {
      setIsLoadingProfile(true)
      setErrorMessage(null)

      const token = await getApiAccessToken()
      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(await buildApiError(response, 'Failed to load profile'))
      }

      const body = (await response.json()) as ProfilePayload
      setDisplayName(body.profile?.displayName ?? '')
      setAvatarKey(resolvePlayerAvatarKey(body.profile?.avatarKey))
      setStatusMessage('Profile loaded.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load profile.')
      setStatusMessage(null)
    } finally {
      setIsLoadingProfile(false)
    }
  }, [getApiAccessToken, isAuthenticated])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const saveProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setErrorMessage('Login is required to manage your profile.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)

      const token = await getApiAccessToken()
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName,
          avatarKey,
        }),
      })

      if (!response.ok) {
        throw new Error(await buildApiError(response, 'Failed to save profile'))
      }

      const body = (await response.json()) as ProfilePayload
      setDisplayName(body.profile?.displayName ?? displayName)
      setAvatarKey(resolvePlayerAvatarKey(body.profile?.avatarKey ?? avatarKey))
      setStatusMessage('Profile updated.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save profile.')
      setStatusMessage(null)
    } finally {
      setIsSubmitting(false)
    }
  }, [avatarKey, displayName, getApiAccessToken, isAuthenticated])

  const handleLogin = useCallback(() => {
    void loginWithRedirect()
  }, [loginWithRedirect])

  const handleLogout = useCallback(() => {
    void logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    })
  }, [logout])

  const profileIdentity = useMemo(() => {
    if (!isAuthenticated || !user) {
      return [] as Array<{ label: string; value: string }>
    }

    const entries: Array<{ label: string; value: string }> = []
    if (multiplayerIdentity?.displayName) {
      entries.push({ label: 'Multiplayer Name', value: multiplayerIdentity.displayName })
    }
    if (typeof user.name === 'string' && user.name.trim()) {
      entries.push({ label: 'Account Name', value: user.name })
    }
    if (typeof user.email === 'string' && user.email.trim()) {
      entries.push({ label: 'Email', value: user.email })
    }
    if (typeof user.sub === 'string' && user.sub.trim()) {
      entries.push({ label: 'Auth ID', value: user.sub })
    }

    return entries
  }, [isAuthenticated, multiplayerIdentity?.displayName, user])

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 md:p-6">
      <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" aria-label="Go to Home" className="shrink-0">
              <img
                src="/assets/branding/dice-odyssey-logo.png"
                alt="Dice Odysseys logo"
                className="h-14 w-14 rounded-md border border-slate-700 object-cover"
              />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-cyan-200">Profile</h1>
              <p className="text-sm text-slate-300">Manage your multiplayer access and display name.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-950/80 p-6">
        <h2 className="text-xl font-bold text-cyan-200">Account Settings</h2>
        <p className="mt-2 text-sm text-slate-300">Manage your multiplayer access and display name.</p>

        <div className="mt-5 rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-cyan-200">Multiplayer Access</span>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-slate-600 px-2 py-1 text-xs font-semibold text-slate-100"
              >
                Log out
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoading}
                className="rounded-md border border-slate-600 px-2 py-1 text-xs font-semibold text-slate-100 disabled:opacity-50"
              >
                {isLoading ? 'Checking auth…' : 'Log in'}
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-300">
            {multiplayerEligibility.eligible
              ? `Eligible for multiplayer as ${multiplayerIdentity?.displayName ?? 'Pilot'}.`
              : multiplayerEligibility.reason === 'AUTH_LOADING'
                ? 'Checking authentication status for multiplayer access.'
                : 'Login is required for multiplayer entry in V1. Local play remains available.'}
          </p>
        </div>

        {isAuthenticated && profileIdentity.length > 0 ? (
          <div className="mt-4 rounded-md border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-200">
            <p className="font-semibold text-cyan-200">Account Information</p>
            <dl className="mt-2 space-y-1">
              {profileIdentity.map((entry) => (
                <div key={entry.label} className="flex flex-wrap gap-2">
                  <dt className="font-semibold text-slate-300">{entry.label}:</dt>
                  <dd className="break-all text-slate-100">{entry.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        <label className="mt-4 flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 p-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={animationEnabled}
            onChange={(event) => onAnimationEnabledChange(event.target.checked)}
          />
          Show animation
        </label>

        {!isAuthenticated ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-slate-200">Log in for Multiplayer Access and to edit your profile.</p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="flex flex-col gap-1 text-sm text-slate-200">
              Display Name
              <input
                className="rounded-md border border-slate-600 bg-slate-900 p-2"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={24}
                placeholder="Pilot-7A3F"
              />
            </label>

            <div className="space-y-2">
              <p className="text-sm text-slate-200">Avatar</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {PLAYER_AVATAR_OPTIONS.map((option) => {
                  const selected = option.key === avatarKey

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setAvatarKey(option.key)}
                      className={`rounded-md border p-2 text-left transition ${
                        selected
                          ? 'border-cyan-400 bg-cyan-900/20'
                          : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
                      }`}
                    >
                      <img
                        src={getPlayerAvatarSrc(option.key)}
                        alt={option.label}
                        className="h-14 w-14 rounded-md border border-slate-700 object-cover"
                        onError={withAvatarFallback}
                      />
                      <p className="mt-2 text-xs font-semibold text-slate-200">{option.label}</p>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-slate-400">
                Selected: {getPlayerAvatarOption(avatarKey).label}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                onClick={() => {
                  void saveProfile()
                }}
                disabled={isSubmitting || isLoadingProfile}
              >
                {isSubmitting ? 'Saving…' : 'Save Profile'}
              </button>

              <button
                type="button"
                className="rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-50"
                onClick={() => {
                  void loadProfile()
                }}
                disabled={isSubmitting || isLoadingProfile}
              >
                {isLoadingProfile ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        )}

        {(statusMessage || errorMessage) && (
          <div className="mt-4 space-y-2 rounded-md border border-slate-700 bg-slate-900/60 p-3 text-xs">
            {statusMessage ? <p className="text-cyan-200">{statusMessage}</p> : null}
            {errorMessage ? <p className="text-rose-300">{errorMessage}</p> : null}
          </div>
        )}
      </section>
    </main>
  )
}
