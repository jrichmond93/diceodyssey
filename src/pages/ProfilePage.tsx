import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { getAuth0EnvConfig } from '../multiplayer/env'

interface ProfilePayload {
  profile?: {
    userId: string
    displayName: string
    avatarUrl?: string | null
    updatedAt?: string
  }
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

export function ProfilePage() {
  const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0()
  const [displayName, setDisplayName] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

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
        }),
      })

      if (!response.ok) {
        throw new Error(await buildApiError(response, 'Failed to save profile'))
      }

      const body = (await response.json()) as ProfilePayload
      setDisplayName(body.profile?.displayName ?? displayName)
      setStatusMessage('Display name updated.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save profile.')
      setStatusMessage(null)
    } finally {
      setIsSubmitting(false)
    }
  }, [displayName, getApiAccessToken, isAuthenticated])

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <section className="rounded-2xl border border-slate-700 bg-slate-950/80 p-6">
        <h1 className="text-2xl font-bold text-cyan-200">Profile</h1>
        <p className="mt-2 text-sm text-slate-300">Manage your multiplayer display name.</p>

        {!isAuthenticated ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-slate-200">Log in to edit your profile.</p>
            <button
              type="button"
              className="rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100"
              onClick={() => {
                void loginWithRedirect()
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Checking auth…' : 'Log in'}
            </button>
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

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                onClick={() => {
                  void saveProfile()
                }}
                disabled={isSubmitting || isLoadingProfile}
              >
                {isSubmitting ? 'Saving…' : 'Save Display Name'}
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
