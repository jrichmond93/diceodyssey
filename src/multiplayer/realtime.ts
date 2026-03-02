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
    const response = await fetch(path, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Snapshot refresh failed with status ${response.status}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      const bodyText = (await response.text()).slice(0, 120)
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
    return await fetchJsonSnapshot(`/api/sessions/${sessionId}`)
  } catch (primaryError) {
    const message = primaryError instanceof Error ? primaryError.message : String(primaryError)

    if (!message.includes('non-JSON')) {
      throw primaryError
    }

    return await fetchJsonSnapshot(`/api/sessions/${sessionId}/index`)
  }
}

const isRealtimeEvent = (value: unknown): value is RealtimeEvent => {
  return Boolean(value && typeof value === 'object' && 'type' in value)
}

const shouldRefreshOnStatus = (status: string): boolean =>
  status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'

export const createSessionRealtimeController = async (
  sessionId: string,
  callbacks: SessionRealtimeCallbacks,
  dependencies: SessionRealtimeDependencies,
): Promise<SessionRealtimeController> => {
  const supabase = dependencies.createClient?.() ?? createRealtimeClient()
  const fetchSnapshotImpl = dependencies.fetchSnapshot ?? fetchSessionSnapshot

  let channel: RealtimeChannel | null = null

  const refreshSnapshot = async (): Promise<void> => {
    try {
      const token = await dependencies.getAccessToken()
      const snapshot = await fetchSnapshotImpl(sessionId, token)
      callbacks.onSnapshot(snapshot)
    } catch (error) {
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
      if (payload.type === 'SESSION_SNAPSHOT' || payload.type === 'TURN_RESOLVED' || payload.type === 'GAME_FINISHED') {
        callbacks.onSnapshot(payload.snapshot)
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
