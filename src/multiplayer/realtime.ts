import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { getDiceSessionChannelTopic, type RealtimeEvent, type SessionSnapshot } from './types'
import { getSupabaseEnvConfig } from './env'

export interface SessionRealtimeCallbacks {
  onEvent: (event: RealtimeEvent) => void
  onSnapshot: (snapshot: SessionSnapshot) => void
  onError?: (message: string) => void
}

export interface SessionRealtimeController {
  disconnect: () => Promise<void>
  refreshSnapshot: () => Promise<void>
}

export interface SessionRealtimeDependencies {
  getAccessToken: () => Promise<string>
  fetchSnapshot?: (sessionId: string, accessToken: string) => Promise<SessionSnapshot>
  createClient?: () => SupabaseClient
}

const createRealtimeClient = (): SupabaseClient => {
  const env = getSupabaseEnvConfig()
  return createClient(env.url, env.anonKey)
}

export const fetchSessionSnapshot = async (
  sessionId: string,
  accessToken: string,
): Promise<SessionSnapshot> => {
  const fetchJsonSnapshot = async (path: string): Promise<SessionSnapshot> => {
    console.debug('[multiplayer] snapshot request', {
      sessionId,
      path,
    })

    const response = await fetch(path, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    console.debug('[multiplayer] snapshot response', {
      sessionId,
      path,
      ok: response.ok,
      status: response.status,
      redirected: response.redirected,
      responseUrl: response.url,
      contentType: response.headers.get('content-type') ?? '',
    })

    if (!response.ok) {
      throw new Error(`Snapshot refresh failed with status ${response.status}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      const bodyText = (await response.text()).slice(0, 120)
      console.error('[multiplayer] snapshot non-json response', {
        sessionId,
        path,
        contentType,
        preview: bodyText,
      })
      throw new Error(
        `Snapshot endpoint returned non-JSON content (${contentType || 'unknown'}). Response starts with: ${bodyText}`,
      )
    }

    const body = (await response.json()) as { snapshot?: SessionSnapshot }
    if (!body.snapshot) {
      throw new Error('Snapshot response missing snapshot payload.')
    }

    return body.snapshot
  }

  try {
    return await fetchJsonSnapshot(`/api/sessions/get?id=${encodeURIComponent(sessionId)}`)
  } catch (firstError) {
    const firstMessage = firstError instanceof Error ? firstError.message : String(firstError)
    console.warn('[multiplayer] first snapshot path failed', {
      sessionId,
      message: firstMessage,
    })

    try {
      return await fetchJsonSnapshot(`/api/sessions/${sessionId}`)
    } catch (secondError) {
      const secondMessage = secondError instanceof Error ? secondError.message : String(secondError)
      console.warn('[multiplayer] second snapshot path failed', {
        sessionId,
        message: secondMessage,
      })

      if (!secondMessage.includes('non-JSON')) {
        throw secondError
      }
    }

    console.warn('[multiplayer] retrying snapshot with third fallback path', {
      sessionId,
      fallbackPath: `/api/sessions/${sessionId}/index`,
    })

    return await fetchJsonSnapshot(`/api/sessions/${sessionId}/index`)
  }
}

const isRealtimeEvent = (value: unknown): value is RealtimeEvent => {
  return Boolean(value && typeof value === 'object' && 'type' in value)
}

const shouldRefreshOnStatus = (status: string): boolean =>
  status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'

const eventRequiresSnapshotRefresh = (event: RealtimeEvent): boolean =>
  event.type === 'PLAYER_JOINED' ||
  event.type === 'PLAYER_LEFT' ||
  event.type === 'MATCH_FOUND' ||
  event.type === 'REMATCH_READY'

export const createSessionRealtimeController = async (
  sessionId: string,
  callbacks: SessionRealtimeCallbacks,
  dependencies: SessionRealtimeDependencies,
): Promise<SessionRealtimeController> => {
  const supabase = dependencies.createClient?.() ?? createRealtimeClient()
  const fetchSnapshotImpl = dependencies.fetchSnapshot ?? fetchSessionSnapshot

  let channel: RealtimeChannel | null = null
  let latestSnapshotVersion = -1

  const publishSnapshot = (
    snapshot: SessionSnapshot,
    options?: {
      force?: boolean
    },
  ) => {
    const force = options?.force ?? false

    if (!force && snapshot.version <= latestSnapshotVersion) {
      return
    }

    latestSnapshotVersion = Math.max(latestSnapshotVersion, snapshot.version)
    callbacks.onSnapshot(snapshot)
  }

  const refreshSnapshot = async (): Promise<void> => {
    try {
      const token = await dependencies.getAccessToken()
      const snapshot = await fetchSnapshotImpl(sessionId, token)
      publishSnapshot(snapshot, { force: true })
    } catch (error) {
      console.error('[multiplayer] refreshSnapshot failed', {
        sessionId,
        error,
      })
      callbacks.onError?.(error instanceof Error ? error.message : 'Snapshot refresh failed')
    }
  }

  channel = supabase
    .channel(getDiceSessionChannelTopic(sessionId))
    .on('broadcast', { event: '*' }, ({ payload }) => {
      if (!isRealtimeEvent(payload)) {
        return
      }

      callbacks.onEvent(payload)
      if (
        payload.type === 'SESSION_SNAPSHOT' ||
        payload.type === 'TURN_RESOLVED' ||
        payload.type === 'GAME_FINISHED' ||
        payload.type === 'GAME_ABANDONED' ||
        payload.type === 'REMATCH_STARTED'
      ) {
        publishSnapshot(payload.snapshot)
        return
      }

      if (eventRequiresSnapshotRefresh(payload)) {
        void refreshSnapshot()
      }
    })

  channel.subscribe((status) => {
    if (shouldRefreshOnStatus(status)) {
      void refreshSnapshot()
    }
  })

  const onlineListener = () => {
    void refreshSnapshot()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', onlineListener)
  }

  return {
    disconnect: async () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onlineListener)
      }

      if (channel) {
        await channel.unsubscribe()
        await supabase.removeChannel(channel)
      }
    },
    refreshSnapshot,
  }
}
