import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { verifyRequestUserMock, getSupabaseAdminClientMock } = vi.hoisted(() => ({
  verifyRequestUserMock: vi.fn(),
  getSupabaseAdminClientMock: vi.fn(),
}))

vi.mock('./_lib/auth', () => ({
  verifyRequestUser: verifyRequestUserMock,
}))

vi.mock('./_lib/supabase', () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}))

import queueHandler from './matchmaking/queue'
import joinHandler from './sessions/[id]/join'
import sessionHandler from './sessions/[id]/index'
import turnIntentHandler from './sessions/[id]/turn-intent'

interface DbRow {
  [key: string]: unknown
}

type TableName = 'dice_sessions' | 'dice_player_seats' | 'dice_turn_intents' | 'dice_session_events'

class FakeSupabaseQuery {
  private filters: Array<{ key: string; value: unknown }> = []
  private sortKey?: string
  private ascending = true
  private mode: 'select' | 'update' | 'delete' = 'select'
  private updatePatch: DbRow = {}

  constructor(
    private table: TableName,
    private db: Record<TableName, DbRow[]>,
  ) {}

  select(selection: string) {
    void selection
    return this
  }

  insert(payload: DbRow | DbRow[]) {
    const rows = Array.isArray(payload) ? payload : [payload]
    this.db[this.table].push(...rows)
    return Promise.resolve({ data: rows, error: null })
  }

  update(patch: DbRow) {
    this.mode = 'update'
    this.updatePatch = patch
    return this
  }

  delete() {
    this.mode = 'delete'
    return this
  }

  eq(key: string, value: unknown) {
    this.filters.push({ key, value })
    return this
  }

  order(key: string, options?: { ascending?: boolean }) {
    this.sortKey = key
    this.ascending = options?.ascending ?? true
    return this
  }

  private filteredRows(): DbRow[] {
    let rows = this.db[this.table].filter((row) =>
      this.filters.every((filter) => row[filter.key] === filter.value),
    )

    if (this.sortKey) {
      rows = [...rows].sort((left, right) => {
        const leftValue = left[this.sortKey!]
        const rightValue = right[this.sortKey!]

        if (leftValue === rightValue) {
          return 0
        }

        if (leftValue === undefined) {
          return 1
        }

        if (rightValue === undefined) {
          return -1
        }

        if (leftValue === null) {
          return 1
        }

        if (rightValue === null) {
          return -1
        }

        const result = leftValue > rightValue ? 1 : -1
        return this.ascending ? result : -result
      })
    }

    return rows
  }

  private execute() {
    if (this.mode === 'delete') {
      const kept = this.db[this.table].filter(
        (row) => !this.filters.every((filter) => row[filter.key] === filter.value),
      )
      this.db[this.table] = kept
      return { data: null, error: null }
    }

    if (this.mode === 'update') {
      const rows = this.filteredRows()
      rows.forEach((row) => Object.assign(row, this.updatePatch))
      return { data: rows, error: null }
    }

    return { data: this.filteredRows(), error: null }
  }

  async single() {
    const result = this.execute()
    const first = Array.isArray(result.data) ? result.data[0] : result.data

    if (!first) {
      return { data: null, error: { message: 'NOT_FOUND' } }
    }

    return { data: first, error: null }
  }

  async maybeSingle() {
    const result = this.execute()
    const first = Array.isArray(result.data) ? result.data[0] : result.data
    return { data: first ?? null, error: null }
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: DbRow[] | null; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }
}

class FakeSupabaseClient {
  constructor(private db: Record<TableName, DbRow[]>) {}

  from(table: string) {
    return new FakeSupabaseQuery(table as TableName, this.db)
  }

  channel(topic: string) {
    void topic
    return {
      send: async () => 'ok',
      unsubscribe: async () => 'ok',
      topic: 'dice_session:test',
    }
  }

  async removeChannel(channel: unknown) {
    void channel
    return 'ok'
  }
}

type MockReqOverrides = Partial<{
  method: string
  query: Record<string, unknown>
  body: unknown
  headers: Record<string, string>
}>

interface MockResponse extends Partial<VercelResponse> {
  getResult: () => { statusCode: number; payload: unknown }
}

interface QueueResponsePayload {
  sessionId: string
}

interface SnapshotPayload {
  snapshot: {
    sessionId: string
    status: string
    version: number
    gameState: {
      turn: number
      currentPlayerIndex: number
      players: Array<{
        id: string
        dicePool: Array<{ id: string }>
      }>
      log: unknown[]
      turnResolutionHistory: unknown[]
    }
    playerSeats: unknown[]
  }
}

interface TurnAckPayload {
  accepted?: boolean
  reason?: string
  latestVersion?: number
  snapshot?: SnapshotPayload['snapshot']
}

const createMockReq = (overrides: MockReqOverrides): VercelRequest =>
  ({
    method: overrides.method ?? 'GET',
    query: overrides.query ?? {},
    body: overrides.body,
    headers: overrides.headers ?? {},
  }) as unknown as VercelRequest

const createMockRes = (): MockResponse => {
  let statusCode = 200
  let payload: unknown = null

  return {
    status(code: number) {
      statusCode = code
      return {
        json(body: unknown) {
          payload = body
        },
      }
    },
    getResult: () => ({ statusCode, payload }),
  }
}

describe('Phase 3 API lifecycle', () => {
  let db: Record<TableName, DbRow[]>

  beforeEach(() => {
    db = {
      dice_sessions: [],
      dice_player_seats: [],
      dice_turn_intents: [],
      dice_session_events: [],
    }

    verifyRequestUserMock.mockReset()
    getSupabaseAdminClientMock.mockReset()
    getSupabaseAdminClientMock.mockReturnValue(new FakeSupabaseClient(db))
    verifyRequestUserMock.mockResolvedValue({ userId: 'auth0|u1', subject: 'auth0|u1' })
  })

  it('supports queue -> join -> session snapshot path', async () => {
    const queueReq = createMockReq({ method: 'POST' })
    const queueRes = createMockRes()
    await queueHandler(queueReq, queueRes)

    const queueResult = queueRes.getResult()
    expect(queueResult.statusCode).toBe(200)
    const sessionId = (queueResult.payload as { sessionId: string }).sessionId

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u2', subject: 'auth0|u2' })
    const joinReq = createMockReq({ method: 'POST', query: { id: sessionId } })
    const joinRes = createMockRes()
    await joinHandler(joinReq, joinRes)

    expect(joinRes.getResult().statusCode).toBe(200)

    const getReq = createMockReq({ method: 'GET', query: { id: sessionId } })
    const getRes = createMockRes()
    await sessionHandler(getReq, getRes)

    const getResult = getRes.getResult()
    expect(getResult.statusCode).toBe(200)
    const snapshot = (getResult.payload as SnapshotPayload).snapshot
    expect(snapshot.sessionId).toBe(sessionId)
    expect(snapshot.playerSeats).toHaveLength(2)
  })

  it('rejects invalid allocation and stale version', async () => {
    db.dice_sessions.push({
      id: 'session-1',
      status: 'active',
      version: 3,
      game_state: {
        started: true,
        mode: 'hotseat',
        players: [
          {
            id: 'p1',
            name: 'P1',
            isAI: false,
            shipPos: 0,
            macGuffins: 0,
            skippedTurns: 0,
            skipImmunity: false,
            defense: 1,
            dicePool: [
              { id: 'p1-die-0', color: 'red' },
              { id: 'p1-die-1', color: 'red' },
              { id: 'p1-die-2', color: 'blue' },
              { id: 'p1-die-3', color: 'blue' },
              { id: 'p1-die-4', color: 'green' },
              { id: 'p1-die-5', color: 'green' },
            ],
          },
          {
            id: 'p2',
            name: 'P2',
            isAI: false,
            shipPos: 0,
            macGuffins: 0,
            skippedTurns: 0,
            skipImmunity: false,
            defense: 1,
            dicePool: [
              { id: 'p2-die-0', color: 'red' },
              { id: 'p2-die-1', color: 'red' },
              { id: 'p2-die-2', color: 'blue' },
              { id: 'p2-die-3', color: 'blue' },
              { id: 'p2-die-4', color: 'green' },
              { id: 'p2-die-5', color: 'green' },
            ],
          },
        ],
        currentPlayerIndex: 0,
        turn: 1,
        galaxy: [
          { id: 1, face: 3, claimed: false, revealed: false },
          { id: 2, face: 4, claimed: false, revealed: false },
        ],
        difficulty: 'medium',
        log: [],
        debugEnabled: false,
        animationEnabled: false,
        debugLog: [],
        turnResolution: { active: false, stage: 'idle', message: '' },
        turnResolutionHistory: [],
      },
    })
    db.dice_player_seats.push({ session_id: 'session-1', user_id: 'auth0|u1', seat: 1 })

    const staleReq = createMockReq({
      method: 'POST',
      query: { id: 'session-1' },
      body: {
        actorUserId: 'auth0|u1',
        actorPlayerId: 'p1',
        expectedVersion: 2,
        allocation: { move: [], claim: [], sabotage: [] },
        clientRequestId: 'req-1',
        sentAt: new Date().toISOString(),
      },
    })
    const staleRes = createMockRes()
    await turnIntentHandler(staleReq, staleRes)
    expect(staleRes.getResult().statusCode).toBe(409)

    const invalidReq = createMockReq({
      method: 'POST',
      query: { id: 'session-1' },
      body: {
        actorUserId: 'auth0|u1',
        actorPlayerId: 'p1',
        expectedVersion: 3,
        allocation: { move: [] },
        clientRequestId: 'req-2',
        sentAt: new Date().toISOString(),
      },
    })
    const invalidRes = createMockRes()
    await turnIntentHandler(invalidReq, invalidRes)
    expect(invalidRes.getResult().statusCode).toBe(400)
    expect((invalidRes.getResult().payload as TurnAckPayload).reason).toBe('INVALID_ALLOCATION')
  })

  it('handles idempotency and concurrent stale submit safely', async () => {
    const queueRes = createMockRes()
    await queueHandler(createMockReq({ method: 'POST' }), queueRes)
    const sessionId = (queueRes.getResult().payload as QueueResponsePayload).sessionId

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u2', subject: 'auth0|u2' })
    await joinHandler(createMockReq({ method: 'POST', query: { id: sessionId } }), createMockRes())
    verifyRequestUserMock.mockResolvedValue({ userId: 'auth0|u1', subject: 'auth0|u1' })

    const body = {
      actorUserId: 'auth0|u1',
      actorPlayerId: 'p1',
      expectedVersion: 1,
      allocation: {
        move: ['p1-die-2', 'p1-die-3'],
        claim: ['p1-die-4', 'p1-die-5'],
        sabotage: ['p1-die-0', 'p1-die-1'],
      },
      clientRequestId: 'same-request',
      sentAt: new Date().toISOString(),
    }

    const firstRes = createMockRes()
    await turnIntentHandler(
      createMockReq({ method: 'POST', query: { id: sessionId }, body }),
      firstRes,
    )
    expect(firstRes.getResult().statusCode).toBe(200)

    const replayRes = createMockRes()
    await turnIntentHandler(
      createMockReq({ method: 'POST', query: { id: sessionId }, body }),
      replayRes,
    )
    expect(replayRes.getResult().statusCode).toBe(200)
    expect((replayRes.getResult().payload as TurnAckPayload).latestVersion).toBeGreaterThanOrEqual(2)

    const conflictRes = createMockRes()
    await turnIntentHandler(
      createMockReq({
        method: 'POST',
        query: { id: sessionId },
        body: {
          ...body,
          clientRequestId: 'new-request',
        },
      }),
      conflictRes,
    )
    expect(conflictRes.getResult().statusCode).toBe(409)
    expect((conflictRes.getResult().payload as TurnAckPayload).reason).toBe('STALE_VERSION')
  })

  it('keeps authoritative session progression consistent across multiple alternating turns', async () => {
    const queueRes = createMockRes()
    await queueHandler(createMockReq({ method: 'POST' }), queueRes)
    const sessionId = (queueRes.getResult().payload as QueueResponsePayload).sessionId

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u2', subject: 'auth0|u2' })
    await joinHandler(createMockReq({ method: 'POST', query: { id: sessionId } }), createMockRes())

    const sessionRes = createMockRes()
    await sessionHandler(createMockReq({ method: 'GET', query: { id: sessionId } }), sessionRes)
    expect(sessionRes.getResult().statusCode).toBe(200)

    let snapshot = (sessionRes.getResult().payload as SnapshotPayload).snapshot
    expect(snapshot.status).toBe('active')

    const versionHistory: number[] = [snapshot.version]
    const turnHistory: number[] = [snapshot.gameState.turn]

    for (let step = 0; step < 6; step += 1) {
      const gameState = snapshot.gameState
      const actor = gameState.players[gameState.currentPlayerIndex]
      const actorUserId = actor.id === 'p1' ? 'auth0|u1' : 'auth0|u2'

      verifyRequestUserMock.mockResolvedValueOnce({ userId: actorUserId, subject: actorUserId })

      const allocation = {
        move: actor.dicePool.slice(0, 2).map((die) => die.id),
        claim: actor.dicePool.slice(2, 4).map((die) => die.id),
        sabotage: actor.dicePool.slice(4, 6).map((die) => die.id),
      }

      const intentRes = createMockRes()
      await turnIntentHandler(
        createMockReq({
          method: 'POST',
          query: { id: sessionId },
          body: {
            actorUserId,
            actorPlayerId: actor.id,
            expectedVersion: snapshot.version,
            allocation,
            clientRequestId: `multi-turn-${step}`,
            sentAt: new Date().toISOString(),
          },
        }),
        intentRes,
      )

      const result = intentRes.getResult()
      expect(result.statusCode).toBe(200)
      const ack = result.payload as TurnAckPayload
      expect(ack.accepted).toBe(true)
      expect(ack.snapshot).toBeTruthy()

      snapshot = ack.snapshot
      versionHistory.push(snapshot.version)
      turnHistory.push(snapshot.gameState.turn)
    }

    for (let index = 1; index < versionHistory.length; index += 1) {
      expect(versionHistory[index]).toBe(versionHistory[index - 1] + 1)
      expect(turnHistory[index]).toBeGreaterThanOrEqual(turnHistory[index - 1])
    }

    expect(snapshot.gameState.log.length).toBeGreaterThan(0)
    expect(snapshot.gameState.turnResolutionHistory.length).toBeGreaterThan(0)
  })
})
