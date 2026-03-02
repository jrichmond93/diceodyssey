import { describe, expect, it, vi } from 'vitest'
import { createSessionRealtimeController } from './realtime'
import type { RealtimeEvent, SessionSnapshot } from './types'

const buildSnapshot = (version: number): SessionSnapshot => ({
  sessionId: 's1',
  version,
  status: 'active',
  gameState: {} as SessionSnapshot['gameState'],
  playerSeats: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

const createMockRealtimeClient = () => {
  const channels: Array<{
    on: ReturnType<typeof vi.fn>
    subscribe: ReturnType<typeof vi.fn>
    unsubscribe: ReturnType<typeof vi.fn>
    emitBroadcast: (payload: unknown) => void
    emitStatus: (status: string) => void
  }> = []

  const client = {
    channel: vi.fn(() => {
      let onHandler: ((input: { payload: unknown }) => void) | null = null
      let statusHandler: ((status: string) => void) | null = null

      const channel = {
        on: vi.fn((_: string, __: unknown, callback: (input: { payload: unknown }) => void) => {
          onHandler = callback
          return channel
        }),
        subscribe: vi.fn((callback: (status: string) => void) => {
          statusHandler = callback
          callback('SUBSCRIBED')
          return channel
        }),
        unsubscribe: vi.fn(async () => 'ok'),
        emitBroadcast: (payload: unknown) => {
          onHandler?.({ payload })
        },
        emitStatus: (status: string) => {
          statusHandler?.(status)
        },
      }

      channels.push(channel)
      return channel
    }),
    removeChannel: vi.fn(async () => undefined),
  }

  return { client, channels }
}

describe('createSessionRealtimeController', () => {
  it('refreshes snapshot on subscribe and routes realtime events', async () => {
    const { client, channels } = createMockRealtimeClient()

    const events: RealtimeEvent[] = []
    const snapshots: SessionSnapshot[] = []
    const baseSnapshot = buildSnapshot(2)

    const controller = await createSessionRealtimeController(
      's1',
      {
        onEvent: (event) => events.push(event),
        onSnapshot: (snapshot) => snapshots.push(snapshot),
      },
      {
        getAccessToken: async () => 'token',
        fetchSnapshot: async () => baseSnapshot,
        createClient: () => client as never,
      },
    )

    await Promise.resolve()
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0]?.version).toBe(2)

    channels[0]?.emitBroadcast({
      type: 'SESSION_SNAPSHOT',
      snapshot: buildSnapshot(3),
    } satisfies RealtimeEvent)

    expect(events).toHaveLength(1)
    expect(snapshots).toHaveLength(2)
    expect(snapshots[1]?.version).toBe(3)

    channels[0]?.emitStatus('CHANNEL_ERROR')
    await Promise.resolve()
    await Promise.resolve()
    expect(snapshots.length).toBeGreaterThanOrEqual(3)
    expect(snapshots.at(-1)?.version).toBe(2)

    await controller.disconnect()
    expect(channels[0]?.unsubscribe).toHaveBeenCalled()
    expect(client.removeChannel).toHaveBeenCalled()
  })

  it('keeps two subscribers synchronized on realtime snapshot events', async () => {
    const { client, channels } = createMockRealtimeClient()
    const snapshotsA: SessionSnapshot[] = []
    const snapshotsB: SessionSnapshot[] = []

    const controllerA = await createSessionRealtimeController(
      's1',
      {
        onEvent: () => undefined,
        onSnapshot: (snapshot) => snapshotsA.push(snapshot),
      },
      {
        getAccessToken: async () => 'token-a',
        fetchSnapshot: async () => buildSnapshot(1),
        createClient: () => client as never,
      },
    )

    const controllerB = await createSessionRealtimeController(
      's1',
      {
        onEvent: () => undefined,
        onSnapshot: (snapshot) => snapshotsB.push(snapshot),
      },
      {
        getAccessToken: async () => 'token-b',
        fetchSnapshot: async () => buildSnapshot(1),
        createClient: () => client as never,
      },
    )

    const nextSnapshot = buildSnapshot(4)

    channels.forEach((channel) => {
      channel.emitBroadcast({
        type: 'SESSION_SNAPSHOT',
        snapshot: nextSnapshot,
      } satisfies RealtimeEvent)
    })

    expect(snapshotsA.at(-1)?.version).toBe(4)
    expect(snapshotsB.at(-1)?.version).toBe(4)

    await controllerA.disconnect()
    await controllerB.disconnect()
  })

  it('rehydrates on reconnect and ignores duplicate/out-of-order snapshots', async () => {
    const { client, channels } = createMockRealtimeClient()
    const snapshots: SessionSnapshot[] = []

    const fetchSnapshot = vi
      .fn<() => Promise<SessionSnapshot>>()
      .mockResolvedValueOnce(buildSnapshot(5))
      .mockResolvedValueOnce(buildSnapshot(8))

    const controller = await createSessionRealtimeController(
      's1',
      {
        onEvent: () => undefined,
        onSnapshot: (snapshot) => snapshots.push(snapshot),
      },
      {
        getAccessToken: async () => 'token',
        fetchSnapshot,
        createClient: () => client as never,
      },
    )

    await Promise.resolve()
    await Promise.resolve()

    expect(snapshots.map((snapshot) => snapshot.version)).toEqual([5])

    channels[0]?.emitBroadcast({ type: 'SESSION_SNAPSHOT', snapshot: buildSnapshot(7) } satisfies RealtimeEvent)
    channels[0]?.emitBroadcast({ type: 'SESSION_SNAPSHOT', snapshot: buildSnapshot(7) } satisfies RealtimeEvent)
    channels[0]?.emitBroadcast({ type: 'SESSION_SNAPSHOT', snapshot: buildSnapshot(6) } satisfies RealtimeEvent)

    expect(snapshots.map((snapshot) => snapshot.version)).toEqual([5, 7])

    channels[0]?.emitStatus('CLOSED')
    await Promise.resolve()
    await Promise.resolve()

    expect(fetchSnapshot).toHaveBeenCalledTimes(2)
    expect(snapshots.map((snapshot) => snapshot.version)).toEqual([5, 7, 8])

    await controller.disconnect()
  })

  it('refreshes snapshot when receiving PLAYER_JOINED without embedded snapshot payload', async () => {
    const { client, channels } = createMockRealtimeClient()
    const snapshots: SessionSnapshot[] = []

    const fetchSnapshot = vi
      .fn<() => Promise<SessionSnapshot>>()
      .mockResolvedValueOnce(buildSnapshot(1))
      .mockResolvedValueOnce(buildSnapshot(2))

    const controller = await createSessionRealtimeController(
      's1',
      {
        onEvent: () => undefined,
        onSnapshot: (snapshot) => snapshots.push(snapshot),
      },
      {
        getAccessToken: async () => 'token',
        fetchSnapshot,
        createClient: () => client as never,
      },
    )

    await Promise.resolve()
    await Promise.resolve()

    expect(snapshots.map((snapshot) => snapshot.version)).toEqual([1])

    channels[0]?.emitBroadcast({
      type: 'PLAYER_JOINED',
      userId: 'auth0|u2',
      displayName: 'Pilot-2',
    } satisfies RealtimeEvent)

    await Promise.resolve()
    await Promise.resolve()

    expect(fetchSnapshot).toHaveBeenCalledTimes(2)
    expect(snapshots.map((snapshot) => snapshot.version)).toEqual([1, 2])

    await controller.disconnect()
  })
})
