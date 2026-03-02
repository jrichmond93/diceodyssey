import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { __resetRateLimiterForTests } from './_lib/rateLimit.js'

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

import queueHandler from './matchmaking/queue.js'
import joinHandler from './sessions/[id]/join.js'
import sessionHandler from './sessions/[id]/index.js'
import turnIntentHandler from './sessions/[id]/turn-intent.js'
import resignHandler from './sessions/resign.js'
import leaveHandler from './sessions/leave.js'
import rematchHandler from './sessions/rematch.js'
import inviteCodeHandler from './sessions/invite-code.js'
import joinByCodeHandler from './sessions/join-by-code.js'
import revokeInviteCodeHandler from './sessions/revoke-invite-code.js'
import profileHandler from './profile.js'
import friendRequestHandler from './friends/request.js'
import friendRespondHandler from './friends/respond.js'
import friendListHandler from './friends/list.js'
import partyInviteHandler from './sessions/party-invite.js'
import partyInviteRespondHandler from './sessions/party-invite/respond.js'
import partyInvitesHandler from './sessions/party-invites.js'

interface DbRow {
  [key: string]: unknown
}

type TableName =
  | 'dice_sessions'
  | 'dice_player_seats'
  | 'dice_turn_intents'
  | 'dice_session_events'
  | 'dice_player_profiles'
  | 'dice_match_invites'
  | 'dice_invite_code_counters'
  | 'dice_blocked_terms'
  | 'dice_friend_edges'
  | 'dice_party_invites'

class FakeSupabaseQuery {
  private filters: Array<{ key: string; value: unknown; op: 'eq' | 'gt' | 'lte' }> = []
  private sortKey?: string
  private ascending = true
  private mode: 'select' | 'update' | 'delete' = 'select'
  private updatePatch: DbRow = {}
  private pendingResult: DbRow[] | null = null
  private pendingError: DbRow | null = null

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
    this.pendingResult = rows
    return this
  }

  upsert(payload: DbRow | DbRow[], options?: { onConflict?: string }) {
    const rows = Array.isArray(payload) ? payload : [payload]
    const conflictKey = options?.onConflict

    const touched: DbRow[] = []

    rows.forEach((row) => {
      if (this.table === 'dice_player_profiles') {
        const normalized = row.display_name_normalized
        if (typeof normalized === 'string') {
          const conflicting = this.db[this.table].find(
            (candidate) =>
              candidate.display_name_normalized === normalized &&
              candidate.user_id !== row.user_id,
          )

          if (conflicting) {
            this.pendingError = {
              code: '23505',
              message: 'duplicate key value violates unique constraint',
            }
            return
          }
        }
      }

      if (conflictKey) {
        const existing = this.db[this.table].find((candidate) => candidate[conflictKey] === row[conflictKey])
        if (existing) {
          Object.assign(existing, row)
          touched.push(existing)
          return
        }
      }

      this.db[this.table].push(row)
      touched.push(row)
    })

    this.pendingResult = touched
    return this
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
    this.filters.push({ key, value, op: 'eq' })
    return this
  }

  gt(key: string, value: unknown) {
    this.filters.push({ key, value, op: 'gt' })
    return this
  }

  lte(key: string, value: unknown) {
    this.filters.push({ key, value, op: 'lte' })
    return this
  }

  order(key: string, options?: { ascending?: boolean }) {
    this.sortKey = key
    this.ascending = options?.ascending ?? true
    return this
  }

  private filteredRows(): DbRow[] {
    let rows = this.db[this.table].filter((row) =>
      this.filters.every((filter) => {
        const rowValue = row[filter.key]
        if (filter.op === 'eq') {
          return rowValue === filter.value
        }

        if (filter.op === 'gt') {
          return rowValue !== undefined && rowValue !== null && rowValue > filter.value
        }

        return rowValue !== undefined && rowValue !== null && rowValue <= filter.value
      }),
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
    if (this.pendingError) {
      return { data: null, error: this.pendingError }
    }

    if (this.pendingResult) {
      return { data: this.pendingResult, error: null }
    }

    if (this.mode === 'delete') {
      const kept = this.db[this.table].filter(
        (row) =>
          !this.filters.every((filter) => {
            if (filter.op !== 'eq') {
              return false
            }

            return row[filter.key] === filter.value
          }),
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

    if (result.error) {
      return { data: null, error: result.error }
    }

    const first = Array.isArray(result.data) ? result.data[0] : result.data

    if (!first) {
      return { data: null, error: { message: 'NOT_FOUND' } }
    }

    return { data: first, error: null }
  }

  async maybeSingle() {
    const result = this.execute()
    if (result.error) {
      return { data: null, error: result.error }
    }

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

  async rpc(fnName: string) {
    if (fnName !== 'dice_next_invite_code') {
      return { data: null, error: { message: 'RPC_NOT_FOUND' } }
    }

    const counter = this.db.dice_invite_code_counters[0]
    if (!counter || typeof counter.word !== 'string' || typeof counter.next_value !== 'number') {
      return { data: null, error: { message: 'NO_COUNTERS' } }
    }

    const current = counter.next_value
    counter.next_value = current + 1
    counter.updated_at = new Date().toISOString()

    return {
      data: `${counter.word}${current}`,
      error: null,
    }
  }
}

type MockReqOverrides = Partial<{
  method: string
  query: Record<string, unknown>
  body: unknown
  headers: Record<string, string>
}>

interface MockResponse {
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
  action?: string
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

const createMockRes = (): VercelResponse & MockResponse => {
  let statusCode = 200
  let payload: unknown = null

  const response = {
    status(code: number) {
      statusCode = code
      return response as unknown as VercelResponse
    },
    json(body: unknown) {
      payload = body
      return response as unknown as VercelResponse
    },
    getResult: () => ({ statusCode, payload }),
  }

  return response as unknown as VercelResponse & MockResponse
}

describe('Phase 3 API lifecycle', () => {
  let db: Record<TableName, DbRow[]>

  beforeEach(() => {
    __resetRateLimiterForTests()
    db = {
      dice_sessions: [],
      dice_player_seats: [],
      dice_turn_intents: [],
      dice_session_events: [],
      dice_player_profiles: [],
      dice_match_invites: [],
      dice_invite_code_counters: [
        {
          word: 'roll',
          next_value: 1,
          updated_at: new Date().toISOString(),
        },
      ],
      dice_blocked_terms: [],
      dice_friend_edges: [],
      dice_party_invites: [],
    }

    verifyRequestUserMock.mockReset()
    getSupabaseAdminClientMock.mockReset()
    getSupabaseAdminClientMock.mockReturnValue(new FakeSupabaseClient(db))
    verifyRequestUserMock.mockResolvedValue({ userId: 'auth0|u1', subject: 'auth0|u1' })
    delete process.env.QUEUE_RATE_LIMIT_PER_MINUTE
    delete process.env.TURN_INTENT_RATE_LIMIT_PER_MINUTE
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

  it('rate limits queue requests when threshold is exceeded', async () => {
    process.env.QUEUE_RATE_LIMIT_PER_MINUTE = '1'

    const firstRes = createMockRes()
    await queueHandler(createMockReq({ method: 'POST', headers: { 'x-forwarded-for': '1.2.3.4' } }), firstRes)
    expect(firstRes.getResult().statusCode).toBe(200)

    const secondRes = createMockRes()
    await queueHandler(createMockReq({ method: 'POST', headers: { 'x-forwarded-for': '1.2.3.4' } }), secondRes)
    expect(secondRes.getResult().statusCode).toBe(429)
    expect((secondRes.getResult().payload as { error?: string }).error).toBe('RATE_LIMITED')
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

  it('supports resign -> rematch -> leave lifecycle transitions', async () => {
    const queueRes = createMockRes()
    await queueHandler(createMockReq({ method: 'POST' }), queueRes)
    const sessionId = (queueRes.getResult().payload as QueueResponsePayload).sessionId

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u2', subject: 'auth0|u2' })
    await joinHandler(createMockReq({ method: 'POST', query: { id: sessionId } }), createMockRes())

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u1', subject: 'auth0|u1' })
    const resignRes = createMockRes()
    await resignHandler(
      createMockReq({
        method: 'POST',
        body: { sessionId, clientRequestId: 'resign-1' },
      }),
      resignRes,
    )

    const resignResult = resignRes.getResult()
    expect(resignResult.statusCode).toBe(200)
    const resignAck = resignResult.payload as TurnAckPayload
    expect(resignAck.accepted).toBe(true)
    expect(resignAck.action).toBe('RESIGN')
    expect(resignAck.snapshot?.status).toBe('finished')

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u2', subject: 'auth0|u2' })
    const rematchRes = createMockRes()
    await rematchHandler(
      createMockReq({
        method: 'POST',
        body: { sessionId, clientRequestId: 'rematch-1' },
      }),
      rematchRes,
    )

    const rematchResult = rematchRes.getResult()
    expect(rematchResult.statusCode).toBe(200)
    const rematchAck = rematchResult.payload as TurnAckPayload
    expect(rematchAck.accepted).toBe(true)
    expect(rematchAck.action).toBe('REMATCH')
    expect(rematchAck.snapshot?.status).toBe('active')
    expect(rematchAck.snapshot?.gameState.turn).toBe(1)

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u1', subject: 'auth0|u1' })
    const leaveRes = createMockRes()
    await leaveHandler(
      createMockReq({
        method: 'POST',
        body: { sessionId, clientRequestId: 'leave-1' },
      }),
      leaveRes,
    )

    const leaveResult = leaveRes.getResult()
    expect(leaveResult.statusCode).toBe(200)
    const leaveAck = leaveResult.payload as TurnAckPayload
    expect(leaveAck.accepted).toBe(true)
    expect(leaveAck.action).toBe('LEAVE')
    expect(leaveAck.snapshot?.status).toBe('abandoned')
  })

  it('rejects rematch while game is still active', async () => {
    const queueRes = createMockRes()
    await queueHandler(createMockReq({ method: 'POST' }), queueRes)
    const sessionId = (queueRes.getResult().payload as QueueResponsePayload).sessionId

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u2', subject: 'auth0|u2' })
    await joinHandler(createMockReq({ method: 'POST', query: { id: sessionId } }), createMockRes())

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u1', subject: 'auth0|u1' })
    const rematchRes = createMockRes()
    await rematchHandler(
      createMockReq({
        method: 'POST',
        body: { sessionId, clientRequestId: 'rematch-active' },
      }),
      rematchRes,
    )

    expect(rematchRes.getResult().statusCode).toBe(409)
    expect((rematchRes.getResult().payload as TurnAckPayload).reason).toBe('REMATCH_NOT_READY')
  })

  it('handles duplicate lifecycle requests safely', async () => {
    const queueRes = createMockRes()
    await queueHandler(createMockReq({ method: 'POST' }), queueRes)
    const sessionId = (queueRes.getResult().payload as QueueResponsePayload).sessionId

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u2', subject: 'auth0|u2' })
    await joinHandler(createMockReq({ method: 'POST', query: { id: sessionId } }), createMockRes())

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u1', subject: 'auth0|u1' })
    const resignFirst = createMockRes()
    await resignHandler(
      createMockReq({ method: 'POST', body: { sessionId, clientRequestId: 'dup-resign-1' } }),
      resignFirst,
    )
    expect(resignFirst.getResult().statusCode).toBe(200)
    expect((resignFirst.getResult().payload as TurnAckPayload).accepted).toBe(true)

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u1', subject: 'auth0|u1' })
    const resignReplay = createMockRes()
    await resignHandler(
      createMockReq({ method: 'POST', body: { sessionId, clientRequestId: 'dup-resign-1' } }),
      resignReplay,
    )
    expect(resignReplay.getResult().statusCode).toBe(200)
    expect((resignReplay.getResult().payload as TurnAckPayload).accepted).toBe(true)

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u2', subject: 'auth0|u2' })
    const rematchFirst = createMockRes()
    await rematchHandler(
      createMockReq({ method: 'POST', body: { sessionId, clientRequestId: 'dup-rematch-1' } }),
      rematchFirst,
    )
    expect(rematchFirst.getResult().statusCode).toBe(200)
    expect((rematchFirst.getResult().payload as TurnAckPayload).accepted).toBe(true)

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u2', subject: 'auth0|u2' })
    const rematchReplay = createMockRes()
    await rematchHandler(
      createMockReq({ method: 'POST', body: { sessionId, clientRequestId: 'dup-rematch-1' } }),
      rematchReplay,
    )
    expect(rematchReplay.getResult().statusCode).toBe(409)
    expect((rematchReplay.getResult().payload as TurnAckPayload).reason).toBe('REMATCH_NOT_READY')

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u1', subject: 'auth0|u1' })
    const leaveFirst = createMockRes()
    await leaveHandler(
      createMockReq({ method: 'POST', body: { sessionId, clientRequestId: 'dup-leave-1' } }),
      leaveFirst,
    )
    expect(leaveFirst.getResult().statusCode).toBe(200)
    expect((leaveFirst.getResult().payload as TurnAckPayload).accepted).toBe(true)

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u1', subject: 'auth0|u1' })
    const leaveReplay = createMockRes()
    await leaveHandler(
      createMockReq({ method: 'POST', body: { sessionId, clientRequestId: 'dup-leave-1' } }),
      leaveReplay,
    )
    expect(leaveReplay.getResult().statusCode).toBe(200)
    expect((leaveReplay.getResult().payload as TurnAckPayload).accepted).toBe(true)
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

  it('creates invite code and allows join-by-code flow', async () => {
    const queueRes = createMockRes()
    await queueHandler(createMockReq({ method: 'POST' }), queueRes)
    const sessionId = (queueRes.getResult().payload as QueueResponsePayload).sessionId

    const inviteRes = createMockRes()
    await inviteCodeHandler(
      createMockReq({
        method: 'POST',
        body: { sessionId },
      }),
      inviteRes,
    )

    expect(inviteRes.getResult().statusCode).toBe(200)
    const invitePayload = inviteRes.getResult().payload as { code: string; expiresAt: string }
    expect(invitePayload.code).toMatch(/^[a-z]+\d+$/)
    expect(invitePayload.code.startsWith('roll')).toBe(true)

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u2', subject: 'auth0|u2', name: 'Sky Pilot' })

    const joinByCodeRes = createMockRes()
    await joinByCodeHandler(
      createMockReq({
        method: 'POST',
        body: { code: invitePayload.code },
      }),
      joinByCodeRes,
    )

    expect(joinByCodeRes.getResult().statusCode).toBe(200)
    expect((joinByCodeRes.getResult().payload as { joined?: boolean }).joined).toBe(true)

    const seats = db.dice_player_seats.filter((seat) => seat.session_id === sessionId)
    expect(seats).toHaveLength(2)

    const inviteRow = db.dice_match_invites.find((invite) => invite.code === invitePayload.code)
    expect(inviteRow?.status).toBe('consumed')
  })

  it('revokes active invite codes for the requesting host', async () => {
    const queueRes = createMockRes()
    await queueHandler(createMockReq({ method: 'POST' }), queueRes)
    const sessionId = (queueRes.getResult().payload as QueueResponsePayload).sessionId

    const inviteRes = createMockRes()
    await inviteCodeHandler(createMockReq({ method: 'POST', body: { sessionId } }), inviteRes)
    expect(inviteRes.getResult().statusCode).toBe(200)

    const revokeRes = createMockRes()
    await revokeInviteCodeHandler(
      createMockReq({ method: 'POST', body: { sessionId } }),
      revokeRes,
    )

    expect(revokeRes.getResult().statusCode).toBe(200)
    expect((revokeRes.getResult().payload as { revokedCount?: number }).revokedCount).toBeGreaterThanOrEqual(1)

    const activeInvites = db.dice_match_invites.filter((invite) => invite.session_id === sessionId)
    expect(activeInvites.every((invite) => invite.status !== 'active')).toBe(true)
  })

  it('rejects blocked display names in profile updates', async () => {
    db.dice_blocked_terms.push({
      term: 'hate',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const profileRes = createMockRes()
    await profileHandler(
      createMockReq({
        method: 'PUT',
        body: {
          displayName: 'hatepilot',
        },
      }),
      profileRes,
    )

    expect(profileRes.getResult().statusCode).toBe(400)
    expect((profileRes.getResult().payload as { error?: string }).error).toBe('DISPLAY_NAME_NOT_ALLOWED')
  })

  it('rejects duplicate display names with DISPLAY_NAME_TAKEN', async () => {
    db.dice_player_profiles.push({
      user_id: 'auth0|u2',
      display_name: 'Captain Nova',
      display_name_normalized: 'captain nova',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const profileRes = createMockRes()
    await profileHandler(
      createMockReq({
        method: 'PUT',
        body: {
          displayName: 'Captain Nova',
        },
      }),
      profileRes,
    )

    expect(profileRes.getResult().statusCode).toBe(409)
    expect((profileRes.getResult().payload as { error?: string }).error).toBe('DISPLAY_NAME_TAKEN')
  })

  it('uses readable display name instead of raw provider subject in seat metadata', async () => {
    verifyRequestUserMock.mockResolvedValueOnce({
      userId: 'auth0|raw-subject-123',
      subject: 'auth0|raw-subject-123',
      name: 'Captain Nova',
    })

    const queueRes = createMockRes()
    await queueHandler(createMockReq({ method: 'POST' }), queueRes)
    expect(queueRes.getResult().statusCode).toBe(200)

    const seat = db.dice_player_seats[0]
    expect(seat?.display_name).toBe('Captain Nova')
  })

  it('supports friend request -> accept -> list lifecycle', async () => {
    db.dice_player_profiles.push(
      {
        user_id: 'auth0|u1',
        display_name: 'Pilot One',
        display_name_normalized: 'pilot one',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        user_id: 'auth0|u2',
        display_name: 'Pilot Two',
        display_name_normalized: 'pilot two',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    )

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u1', subject: 'auth0|u1' })

    const requestRes = createMockRes()
    await friendRequestHandler(
      createMockReq({ method: 'POST', body: { targetDisplayName: 'Pilot Two' } }),
      requestRes,
    )

    expect(requestRes.getResult().statusCode).toBe(200)
    expect(db.dice_friend_edges).toHaveLength(1)

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u2', subject: 'auth0|u2' })

    const incomingListRes = createMockRes()
    await friendListHandler(createMockReq({ method: 'GET' }), incomingListRes)

    expect(incomingListRes.getResult().statusCode).toBe(200)
    const incomingPayload = incomingListRes.getResult().payload as {
      incomingRequests?: Array<{ userId: string }>
    }
    expect(incomingPayload.incomingRequests?.some((entry) => entry.userId === 'auth0|u1')).toBe(true)

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u2', subject: 'auth0|u2' })

    const respondRes = createMockRes()
    await friendRespondHandler(
      createMockReq({
        method: 'POST',
        body: {
          requesterUserId: 'auth0|u1',
          action: 'ACCEPT',
        },
      }),
      respondRes,
    )

    expect(respondRes.getResult().statusCode).toBe(200)

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|u1', subject: 'auth0|u1' })

    const friendListRes = createMockRes()
    await friendListHandler(createMockReq({ method: 'GET' }), friendListRes)

    expect(friendListRes.getResult().statusCode).toBe(200)
    const friendPayload = friendListRes.getResult().payload as { friends?: Array<{ userId: string }> }
    expect(friendPayload.friends?.some((entry) => entry.userId === 'auth0|u2')).toBe(true)
  })

  it('allows accepted party invite to join session', async () => {
    db.dice_player_profiles.push(
      {
        user_id: 'auth0|host',
        display_name: 'Host Pilot',
        display_name_normalized: 'host pilot',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        user_id: 'auth0|friend',
        display_name: 'Friend Pilot',
        display_name_normalized: 'friend pilot',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    )

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|host', subject: 'auth0|host', name: 'Host Pilot' })

    const queueRes = createMockRes()
    await queueHandler(createMockReq({ method: 'POST' }), queueRes)
    const sessionId = (queueRes.getResult().payload as QueueResponsePayload).sessionId

    db.dice_friend_edges.push({
      requester_user_id: 'auth0|host',
      addressee_user_id: 'auth0|friend',
      status: 'accepted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|host', subject: 'auth0|host' })

    const inviteRes = createMockRes()
    await partyInviteHandler(
      createMockReq({
        method: 'POST',
        body: {
          sessionId,
          toDisplayName: 'Friend Pilot',
        },
      }),
      inviteRes,
    )

    expect(inviteRes.getResult().statusCode).toBe(200)
    const invitePayload = inviteRes.getResult().payload as { invite?: { id: string } }
    const inviteId = invitePayload.invite?.id
    expect(typeof inviteId).toBe('string')

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|friend', subject: 'auth0|friend', name: 'Friend Pilot' })

    const acceptRes = createMockRes()
    await partyInviteRespondHandler(
      createMockReq({
        method: 'POST',
        body: {
          inviteId,
          action: 'ACCEPT',
        },
      }),
      acceptRes,
    )

    expect(acceptRes.getResult().statusCode).toBe(200)
    const seats = db.dice_player_seats.filter((seat) => seat.session_id === sessionId)
    expect(seats).toHaveLength(2)

    const inviteRow = db.dice_party_invites.find((row) => row.id === inviteId)
    expect(inviteRow?.status).toBe('accepted')
  })

  it('lists received party invites for target user', async () => {
    db.dice_party_invites.push({
      id: 'invite-1',
      session_id: 'session-abc',
      from_user_id: 'auth0|host',
      to_user_id: 'auth0|friend',
      status: 'pending',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    verifyRequestUserMock.mockResolvedValueOnce({ userId: 'auth0|friend', subject: 'auth0|friend' })

    const listRes = createMockRes()
    await partyInvitesHandler(createMockReq({ method: 'GET' }), listRes)

    expect(listRes.getResult().statusCode).toBe(200)
    const payload = listRes.getResult().payload as {
      received?: Array<{ id: string }>
    }
    expect(payload.received?.some((invite) => invite.id === 'invite-1')).toBe(true)
  })

  it('meets concurrent-session soak error budget under sustained parallel activity', async () => {
    process.env.QUEUE_RATE_LIMIT_PER_MINUTE = '10000'
    process.env.TURN_INTENT_RATE_LIMIT_PER_MINUTE = '10000'

    verifyRequestUserMock.mockImplementation(async (request: VercelRequest) => {
      const headerValue = request.headers['x-test-user']
      const userId = (Array.isArray(headerValue) ? headerValue[0] : headerValue) ?? 'auth0|u1'
      return { userId, subject: userId, name: `Pilot-${userId.slice(-2)}` }
    })

    const concurrentSessions = 12
    const turnsPerSession = 6

    const runSession = async (sessionIndex: number) => {
      const userA = `auth0|soak-u1-${sessionIndex}`
      const userB = `auth0|soak-u2-${sessionIndex}`

      const queueRes = createMockRes()
      await queueHandler(createMockReq({ method: 'POST', headers: { 'x-test-user': userA } }), queueRes)

      const queueResult = queueRes.getResult()
      if (queueResult.statusCode !== 200) {
        throw new Error(`queue_failed_${sessionIndex}_${queueResult.statusCode}`)
      }

      const sessionId = (queueResult.payload as QueueResponsePayload).sessionId

      const joinRes = createMockRes()
      await joinHandler(
        createMockReq({ method: 'POST', query: { id: sessionId }, headers: { 'x-test-user': userB } }),
        joinRes,
      )

      const joinResult = joinRes.getResult()
      if (joinResult.statusCode !== 200) {
        throw new Error(`join_failed_${sessionIndex}_${joinResult.statusCode}`)
      }

      const sessionRes = createMockRes()
      await sessionHandler(
        createMockReq({ method: 'GET', query: { id: sessionId }, headers: { 'x-test-user': userA } }),
        sessionRes,
      )

      const sessionResult = sessionRes.getResult()
      if (sessionResult.statusCode !== 200) {
        throw new Error(`session_get_failed_${sessionIndex}_${sessionResult.statusCode}`)
      }

      let snapshot = (sessionResult.payload as SnapshotPayload).snapshot
      let intentCount = 0

      for (let turn = 0; turn < turnsPerSession; turn += 1) {
        const gameState = snapshot.gameState
        const actor = gameState.players[gameState.currentPlayerIndex]
        const actorUserId = actor.id === 'p1' ? userA : userB

        const intentRes = createMockRes()
        await turnIntentHandler(
          createMockReq({
            method: 'POST',
            query: { id: sessionId },
            headers: { 'x-test-user': actorUserId },
            body: {
              actorUserId,
              actorPlayerId: actor.id,
              expectedVersion: snapshot.version,
              allocation: {
                move: actor.dicePool.slice(0, 2).map((die) => die.id),
                claim: actor.dicePool.slice(2, 4).map((die) => die.id),
                sabotage: actor.dicePool.slice(4, 6).map((die) => die.id),
              },
              clientRequestId: `soak-${sessionIndex}-${turn}`,
              sentAt: new Date().toISOString(),
            },
          }),
          intentRes,
        )

        const intentResult = intentRes.getResult()
        if (intentResult.statusCode !== 200) {
          throw new Error(`intent_failed_${sessionIndex}_${turn}_${intentResult.statusCode}`)
        }

        const ack = intentResult.payload as TurnAckPayload
        if (!ack.accepted || !ack.snapshot) {
          throw new Error(`intent_not_accepted_${sessionIndex}_${turn}`)
        }

        snapshot = ack.snapshot
        intentCount += 1
      }

      return {
        sessionId,
        intentCount,
        finalVersion: snapshot.version,
      }
    }

    const results = await Promise.allSettled(
      Array.from({ length: concurrentSessions }, (_, index) => runSession(index + 1)),
    )

    const failed = results.filter((result) => result.status === 'rejected')
    const successful = results.filter((result) => result.status === 'fulfilled')

    const totalExpectedOperations = concurrentSessions * (3 + turnsPerSession)
    const failedOperations = failed.length
    const errorRate = failedOperations / totalExpectedOperations

    expect(successful.length).toBe(concurrentSessions)
    expect(failed.length).toBe(0)
    expect(errorRate).toBeLessThanOrEqual(0.01)

    const sessionRows = db.dice_sessions.filter((row) => typeof row.id === 'string')
    expect(sessionRows.length).toBeGreaterThanOrEqual(concurrentSessions)
  })

  it('resolves server AI turns without any client tick', async () => {
    db.dice_sessions.push({
      id: 'session-ai-1',
      status: 'active',
      version: 5,
      game_state: {
        started: true,
        mode: 'hotseat',
        players: [
          {
            id: 'p1',
            name: 'Human',
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
            name: 'AI 1',
            isAI: true,
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
        galaxy: Array.from({ length: 12 }, (_, index) => ({
          id: index + 1,
          face: (index % 4) + 3,
          claimed: false,
          revealed: false,
        })),
        difficulty: 'medium',
        log: [],
        debugEnabled: false,
        animationEnabled: false,
        debugLog: [],
        turnResolution: { active: false, stage: 'idle', message: '' },
        turnResolutionHistory: [],
      },
    })

    db.dice_player_seats.push({ session_id: 'session-ai-1', user_id: 'auth0|u1', seat: 1 })

    const response = createMockRes()
    await turnIntentHandler(
      createMockReq({
        method: 'POST',
        query: { id: 'session-ai-1' },
        body: {
          actorUserId: 'auth0|u1',
          actorPlayerId: 'p1',
          expectedVersion: 5,
          allocation: {
            move: ['p1-die-2', 'p1-die-3'],
            claim: ['p1-die-4', 'p1-die-5'],
            sabotage: ['p1-die-0', 'p1-die-1'],
          },
          clientRequestId: 'ai-chain-1',
          sentAt: new Date().toISOString(),
        },
      }),
      response,
    )

    expect(response.getResult().statusCode).toBe(200)

    const payload = response.getResult().payload as TurnAckPayload
    expect(payload.accepted).toBe(true)
    expect(payload.snapshot).toBeTruthy()
    expect(payload.snapshot!.gameState.currentPlayerIndex).toBe(0)
    expect(payload.snapshot!.gameState.turn).toBeGreaterThanOrEqual(2)
    expect(payload.latestVersion).toBeGreaterThanOrEqual(6)
  })
})
