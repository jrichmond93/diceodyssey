import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomInt } from 'node:crypto'
import { verifyRequestUser } from '../../_lib/auth.js'
import { getServerEnv } from '../../_lib/env.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../../_lib/http.js'
import { consumeRateLimit } from '../../_lib/rateLimit.js'
import { getSupabaseAdminClient } from '../../_lib/supabase.js'
import { publishSessionRealtimeEventBestEffort } from '../../_lib/realtime.js'
import { createApiRequestContext } from '../../_lib/requestContext.js'
import { mapSessionSnapshot, type SeatRow, type SessionRow as SnapshotSessionRow } from '../../_lib/sessionSnapshot.js'
import { advanceToNextPlayer, applyAllocationToCurrentPlayer } from '../../_lib/serverGameState.js'
import { computeAIAllocation, resolveCurrentPlayerTurn } from '../../../src/engine/gameEngine.js'
import type { Allocation, GameState } from '../../../src/types.js'

interface TurnIntentBody {
  actorUserId: string
  actorPlayerId: string
  expectedVersion: number
  allocation: Allocation
  clientRequestId: string
  sentAt: string
}

type SessionRow = {
  id: string
  version: number
  status: 'lobby' | 'active' | 'finished' | 'abandoned'
  game_state: unknown
}

const isValidAllocation = (allocation: TurnIntentBody['allocation']): boolean => {
  if (!allocation || typeof allocation !== 'object') {
    return false
  }

  const keys: Array<keyof Allocation> = ['move', 'claim', 'sabotage']
  return keys.every((key) => Array.isArray(allocation[key]))
}

const isGameStateLike = (state: unknown): state is GameState => {
  if (!state || typeof state !== 'object') {
    return false
  }

  const candidate = state as Partial<GameState>
  return (
    typeof candidate.turn === 'number' &&
    typeof candidate.currentPlayerIndex === 'number' &&
    Array.isArray(candidate.players) &&
    Array.isArray(candidate.galaxy)
  )
}

const getServerRngProvider = () => ({
  rollDie: () => randomInt(1, 7),
  nextFloat: () => randomInt(0, 1_000_000) / 1_000_000,
})

const resolveServerAITurns = (state: GameState): GameState => {
  let nextState = state
  const maxServerTurns = Math.max(6, state.players.length * 3)
  let processed = 0

  while (!nextState.winnerId && !nextState.winnerReason && processed < maxServerTurns) {
    const current = nextState.players[nextState.currentPlayerIndex]
    if (!current?.isAI) {
      break
    }

    let stateForResolution = nextState
    if (current.skippedTurns <= 0) {
      const aiAllocation = computeAIAllocation(
        current,
        nextState.players,
        nextState.galaxy,
        nextState.turn,
        nextState.difficulty,
        getServerRngProvider(),
      )

      const allocated = applyAllocationToCurrentPlayer(nextState, aiAllocation)
      if (!allocated) {
        break
      }

      stateForResolution = allocated
    }

    const resolved = resolveCurrentPlayerTurn(stateForResolution, {
      rng: getServerRngProvider(),
      createLogEntryId: () => crypto.randomUUID(),
    })

    nextState = resolved.winnerId || resolved.winnerReason ? resolved : advanceToNextPlayer(resolved)
    processed += 1
  }

  return nextState
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestContext = createApiRequestContext(req, '/api/sessions/[id]/turn-intent')

  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  const sessionId = req.query.id as string
  if (!sessionId) {
    sendJson(res, 400, {
      accepted: false,
      reason: 'SESSION_CLOSED',
      requestId: 'unknown',
      traceId: requestContext.traceId,
    })
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const body = await readJsonBody<TurnIntentBody>(req)

    const serverEnv = getServerEnv()
    const rate = consumeRateLimit(
      'turn-intent',
      `${user.userId}:${sessionId}`,
      serverEnv.turnIntentRateLimitPerMinute,
      60_000,
    )

    if (!rate.allowed) {
      requestContext.logWarn('turn_intent_rate_limited', {
        userId: user.userId,
        sessionId,
        retryAfterSeconds: rate.retryAfterSeconds,
      })

      sendJson(res, 429, {
        accepted: false,
        reason: 'SESSION_CLOSED',
        detail: 'RATE_LIMITED',
        retryAfterSeconds: rate.retryAfterSeconds,
        requestId: body.clientRequestId ?? 'unknown',
        traceId: requestContext.traceId,
      })
      return
    }

    if (body.actorUserId !== user.userId || !body.clientRequestId) {
      sendJson(res, 401, {
        accepted: false,
        reason: 'NOT_YOUR_TURN',
        requestId: body.clientRequestId ?? 'unknown',
        traceId: requestContext.traceId,
      })
      return
    }

    if (!isValidAllocation(body.allocation)) {
      sendJson(res, 400, {
        accepted: false,
        reason: 'INVALID_ALLOCATION',
        requestId: body.clientRequestId,
        traceId: requestContext.traceId,
      })
      return
    }

    const supabase = getSupabaseAdminClient()

    const existingIntent = await supabase
      .from('dice_turn_intents')
      .select('client_request_id, session_version')
      .eq('session_id', sessionId)
      .eq('client_request_id', body.clientRequestId)
      .maybeSingle()

    if (existingIntent.error) {
      throw existingIntent.error
    }

    if (existingIntent.data) {
      const latestSession = await supabase
        .from('dice_sessions')
        .select('version')
        .eq('id', sessionId)
        .maybeSingle()

      sendJson(res, 200, {
        accepted: true,
        requestId: body.clientRequestId,
        latestVersion: latestSession.data?.version ?? existingIntent.data.session_version,
        traceId: requestContext.traceId,
      })
      return
    }

    const sessionResult = await supabase
      .from('dice_sessions')
      .select('id, version, status, game_state')
      .eq('id', sessionId)
      .single()

    if (
      sessionResult.error ||
      !sessionResult.data ||
      (sessionResult.data.status !== 'lobby' && sessionResult.data.status !== 'active')
    ) {
      sendJson(res, 400, {
        accepted: false,
        reason: 'SESSION_CLOSED',
        requestId: body.clientRequestId,
        traceId: requestContext.traceId,
      })
      return
    }

    if (sessionResult.data.version !== body.expectedVersion) {
      sendJson(res, 409, {
        accepted: false,
        reason: 'STALE_VERSION',
        latestVersion: sessionResult.data.version,
        requestId: body.clientRequestId,
        traceId: requestContext.traceId,
      })
      return
    }

    const session = sessionResult.data as SessionRow

    if (!isGameStateLike(session.game_state)) {
      sendJson(res, 400, {
        accepted: false,
        reason: 'SESSION_CLOSED',
        requestId: body.clientRequestId,
        detail: 'SESSION_STATE_NOT_READY',
        traceId: requestContext.traceId,
      })
      return
    }

    const sessionGameState = session.game_state
    const currentPlayer = sessionGameState.players[sessionGameState.currentPlayerIndex]

    if (!currentPlayer || currentPlayer.isAI || currentPlayer.id !== body.actorPlayerId) {
      sendJson(res, 403, {
        accepted: false,
        reason: 'NOT_YOUR_TURN',
        requestId: body.clientRequestId,
        traceId: requestContext.traceId,
      })
      return
    }

    const seatResult = await supabase
      .from('dice_player_seats')
      .select('user_id')
      .eq('session_id', sessionId)
      .eq('user_id', user.userId)
      .maybeSingle()

    if (seatResult.error) {
      throw seatResult.error
    }

    if (!seatResult.data) {
      sendJson(res, 403, {
        accepted: false,
        reason: 'NOT_YOUR_TURN',
        requestId: body.clientRequestId,
        traceId: requestContext.traceId,
      })
      return
    }

    let stateForResolution = sessionGameState

    if (currentPlayer.skippedTurns <= 0) {
      const allocated = applyAllocationToCurrentPlayer(stateForResolution, body.allocation)
      if (!allocated) {
        sendJson(res, 400, {
          accepted: false,
          reason: 'INVALID_ALLOCATION',
          requestId: body.clientRequestId,
          traceId: requestContext.traceId,
        })
        return
      }

      const allocatedPlayer = allocated.players[allocated.currentPlayerIndex]
      if (!allocatedPlayer?.allocation) {
        sendJson(res, 400, {
          accepted: false,
          reason: 'INVALID_ALLOCATION',
          requestId: body.clientRequestId,
          traceId: requestContext.traceId,
        })
        return
      }

      stateForResolution = allocated
    }

    const resolvedState = resolveCurrentPlayerTurn(stateForResolution, {
      rng: getServerRngProvider(),
      createLogEntryId: () => crypto.randomUUID(),
    })

    const afterHumanTurn = resolvedState.winnerId ? resolvedState : advanceToNextPlayer(resolvedState)
    const postTurnState = resolveServerAITurns(afterHumanTurn)

    const resolvedTurnCount = Math.max(1, postTurnState.turn - sessionGameState.turn)
    const nextVersion = body.expectedVersion + resolvedTurnCount

    const nextSessionStatus: SessionRow['status'] =
      postTurnState.winnerId || postTurnState.winnerReason
        ? 'finished'
        : session.status === 'lobby'
          ? 'active'
          : session.status

    const now = new Date().toISOString()

    const intentInsert = await supabase.from('dice_turn_intents').insert({
      session_id: sessionId,
      actor_user_id: body.actorUserId,
      actor_player_id: body.actorPlayerId,
      session_version: body.expectedVersion,
      allocation: body.allocation,
      client_request_id: body.clientRequestId,
      sent_at: body.sentAt,
      created_at: now,
    })

    if (intentInsert.error) {
      throw intentInsert.error
    }

    const sessionUpdate = await supabase
      .from('dice_sessions')
      .update({
        status: nextSessionStatus,
        game_state: postTurnState,
        version: nextVersion,
        updated_at: now,
      })
      .eq('id', sessionId)
      .eq('version', body.expectedVersion)
      .select('version, game_state, status')
      .single()

    if (sessionUpdate.error || !sessionUpdate.data) {
      await supabase
        .from('dice_turn_intents')
        .delete()
        .eq('session_id', sessionId)
        .eq('client_request_id', body.clientRequestId)

      sendJson(res, 409, {
        accepted: false,
        reason: 'STALE_VERSION',
        latestVersion: body.expectedVersion,
        requestId: body.clientRequestId,
        traceId: requestContext.traceId,
      })
      return
    }

    await supabase.from('dice_session_events').insert({
      session_id: sessionId,
      event_type: 'TURN_ACCEPTED',
      payload: {
        requestId: body.clientRequestId,
        actorUserId: body.actorUserId,
        expectedVersion: body.expectedVersion,
      },
      created_at: now,
    })

    await supabase.from('dice_session_events').insert({
      session_id: sessionId,
      event_type: 'TURN_RESOLVED',
      payload: {
        requestId: body.clientRequestId,
        version: sessionUpdate.data.version,
        status: sessionUpdate.data.status,
        resolvedTurnCount,
      },
      created_at: now,
    })

    const seatResultForSnapshot = await supabase
      .from('dice_player_seats')
      .select('seat, user_id, display_name, connected, is_ai')
      .eq('session_id', sessionId)
      .order('seat', { ascending: true })

    const snapshot =
      !seatResultForSnapshot.error && seatResultForSnapshot.data
        ? mapSessionSnapshot(
            {
              id: sessionId,
              version: sessionUpdate.data.version,
              status: sessionUpdate.data.status,
              game_state: sessionUpdate.data.game_state,
              created_at: now,
              updated_at: now,
            } as SnapshotSessionRow,
            seatResultForSnapshot.data as SeatRow[],
          )
        : {
            sessionId,
            version: sessionUpdate.data.version,
            status: sessionUpdate.data.status,
            gameState: sessionUpdate.data.game_state,
            playerSeats: [],
            createdAt: now,
            updatedAt: now,
          }

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'TURN_ACCEPTED',
      requestId: body.clientRequestId,
      version: sessionUpdate.data.version,
    })

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'TURN_RESOLVED',
      snapshot,
    })

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'SESSION_SNAPSHOT',
      snapshot,
    })

    if (snapshot.status === 'finished') {
      await publishSessionRealtimeEventBestEffort(sessionId, {
        type: 'GAME_FINISHED',
        snapshot,
      })
    }

    sendJson(res, 200, {
      accepted: true,
      latestVersion: sessionUpdate.data.version,
      requestId: body.clientRequestId,
      snapshot,
      traceId: requestContext.traceId,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      requestContext.logWarn('turn_intent_unauthorized')
      sendJson(res, 401, {
        accepted: false,
        reason: 'NOT_YOUR_TURN',
        requestId: 'unknown',
        traceId: requestContext.traceId,
      })
      return
    }

    requestContext.logError('turn_intent_failed', {
      detail: error instanceof Error ? error.message : 'Unknown error',
    })

    sendJson(res, 500, {
      accepted: false,
      reason: 'SESSION_CLOSED',
      requestId: 'unknown',
      detail: error instanceof Error ? error.message : 'Unknown error',
      traceId: requestContext.traceId,
    })
  }
}
