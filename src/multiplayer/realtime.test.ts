import { describe, expect, it, vi } from 'vitest'
import { createSessionRealtimeController } from './realtime'
import type { RealtimeEvent, SessionSnapshot } from './types'

const mockSnapshot: SessionSnapshot = {
  sessionId: 's1',
  version: 2,
  status: 'active',
  gameState: {} as SessionSnapshot['gameState'],
  playerSeats: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('createSessionRealtimeController', () => {
  it('refreshes snapshot on subscribe and routes realtime events', async () => {
    const unsubscribe = vi.fn(async () => 'ok')

    const channel = {
      on: vi.fn((_: string, __: unknown, callback: (input: { payload: unknown }) => void) => {
        void callback
        return channel
      }),
      subscribe: vi.fn((callback: (status: string) => void) => {
        callback('SUBSCRIBED')
        return channel
      }),
      unsubscribe,
    }

    const removeChannel = vi.fn(async () => undefined)

    const client = {
      channel: vi.fn(() => channel),
      removeChannel,
    }

    const events: RealtimeEvent[] = []
    const snapshots: SessionSnapshot[] = []

    const controller = await createSessionRealtimeController(
      's1',
      {
        onEvent: (event) => events.push(event),
        onSnapshot: (snapshot) => snapshots.push(snapshot),
      },
      {
        getAccessToken: async () => 'token',
        fetchSnapshot: async () => mockSnapshot,
        createClient: () => client as never,
      },
    )

    await Promise.resolve()
    expect(snapshots).toHaveLength(1)

    const broadcastHandler = channel.on.mock.calls[0]?.[2] as
      | ((input: { payload: unknown }) => void)
      | undefined

    expect(broadcastHandler).toBeTypeOf('function')
    if (!broadcastHandler) {
      throw new Error('Missing broadcast handler callback')
    }

    broadcastHandler({
      payload: {
        type: 'SESSION_SNAPSHOT',
        snapshot: mockSnapshot,
      } satisfies RealtimeEvent,
    })

    expect(events).toHaveLength(1)
    expect(snapshots).toHaveLength(2)

    const statusHandler = channel.subscribe.mock.calls[0]?.[0] as ((status: string) => void) | undefined

    expect(statusHandler).toBeTypeOf('function')
    if (!statusHandler) {
      throw new Error('Missing subscribe status callback')
    }

    statusHandler('CHANNEL_ERROR')
    await Promise.resolve()
    await Promise.resolve()
    expect(snapshots.length).toBeGreaterThanOrEqual(3)

    await controller.disconnect()
    expect(unsubscribe).toHaveBeenCalled()
    expect(removeChannel).toHaveBeenCalled()
  })
})
