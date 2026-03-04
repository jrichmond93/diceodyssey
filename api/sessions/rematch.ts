import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js'
import { publishSessionRealtimeEventBestEffort } from '../_lib/realtime.js'
import { createHybridGameState } from '../_lib/serverGameState.js'
import { mapSessionSnapshot, type SeatRow, type SessionRow } from '../_lib/sessionSnapshot.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'

interface RematchBody {
  sessionId?: string
  clientRequestId?: string
  seatPlan?: Array<'auto' | 'human' | 'ai'>
}

type SessionStatus = 'lobby' | 'active' | 'finished' | 'abandoned'

interface SessionLifecycleRow {
  id: string
  version: number
  status: SessionStatus
  game_state: unknown
  created_at: string
  updated_at: string
}

const isValidSeatMode = (value: unknown): value is 'auto' | 'human' | 'ai' =>
  value === 'auto' || value === 'human' || value === 'ai'

interface RematchSeatAssignment {
  seat: number
  userId: string
  displayName: string
  avatarKey?: string | null
  connected: boolean
  isAI: boolean
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const body = await readJsonBody<RematchBody>(req)
    const sessionId = (body.sessionId ?? (req.query.id as string) ?? '').trim()

    if (!sessionId) {
      sendJson(res, 400, {
        accepted: false,
        action: 'REMATCH',
        reason: 'SESSION_CLOSED',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId: '',
      })
      return
    }

    const supabase = getSupabaseAdminClient()

    const seatMembership = await supabase
      .from('dice_player_seats')
      .select('user_id')
      .eq('session_id', sessionId)
      .eq('user_id', user.userId)
      .maybeSingle()

    if (seatMembership.error) {
      throw seatMembership.error
    }

    if (!seatMembership.data) {
      sendJson(res, 403, {
        accepted: false,
        action: 'REMATCH',
        reason: 'NOT_IN_SESSION',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
      })
      return
    }

    const sessionResult = await supabase
      .from('dice_sessions')
      .select('id, version, status, game_state, created_at, updated_at')
      .eq('id', sessionId)
      .single()

    if (sessionResult.error || !sessionResult.data) {
      sendJson(res, 404, {
        accepted: false,
        action: 'REMATCH',
        reason: 'SESSION_CLOSED',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
      })
      return
    }

    const session = sessionResult.data as SessionLifecycleRow

    if (session.status === 'active' || session.status === 'lobby') {
      sendJson(res, 409, {
        accepted: false,
        action: 'REMATCH',
        reason: 'REMATCH_NOT_READY',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
        latestVersion: session.version,
      })
      return
    }

    const seatsResult = await supabase
      .from('dice_player_seats')
      .select('seat, user_id, display_name, avatar_key, connected, is_ai')
      .eq('session_id', sessionId)
      .order('seat', { ascending: true })

    if (seatsResult.error) {
      throw seatsResult.error
    }

    const seats = (seatsResult.data ?? []) as SeatRow[]

    const requestedSeatPlan = body.seatPlan
    if (requestedSeatPlan && !Array.isArray(requestedSeatPlan)) {
      sendJson(res, 400, {
        accepted: false,
        action: 'REMATCH',
        reason: 'REMATCH_INVALID_PLAN',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
      })
      return
    }

    if (requestedSeatPlan && requestedSeatPlan.some((mode) => !isValidSeatMode(mode))) {
      sendJson(res, 400, {
        accepted: false,
        action: 'REMATCH',
        reason: 'REMATCH_INVALID_PLAN',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
      })
      return
    }

    const seatPlan = seats.map((_, index) => requestedSeatPlan?.[index] ?? 'auto')
    const lockedSeatIndex = seats.findIndex((seat, index) => {
      if (seatPlan[index] !== 'human') {
        return false
      }

      return seat.connected !== true || seat.is_ai === true
    })

    if (lockedSeatIndex >= 0) {
      sendJson(res, 409, {
        accepted: false,
        action: 'REMATCH',
        reason: 'REMATCH_SEAT_LOCKED',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
      })
      return
    }

    const seatByNumber = new Map<number, SeatRow>()
    seats.forEach((seat) => {
      seatByNumber.set(seat.seat, seat)
    })

    const connectedHumanBySeat = new Map<number, SeatRow>()
    seats
      .filter((seat) => seat.is_ai !== true && seat.connected === true)
      .forEach((seat) => connectedHumanBySeat.set(seat.seat, seat))

    const unusedConnectedHumans = seats.filter((seat) => seat.is_ai !== true && seat.connected === true)
    const consumeConnectedHuman = (): SeatRow | undefined => {
      const next = unusedConnectedHumans.shift()
      if (!next) {
        return undefined
      }

      connectedHumanBySeat.delete(next.seat)
      return next
    }

    const rematchAssignments: RematchSeatAssignment[] = seats.map((seat, index) => {
      const mode = seatPlan[index]
      const seatNumber = seat.seat

      if (mode === 'ai') {
        return {
          seat: seatNumber,
          userId: `ai|rematch-${sessionId}-${seatNumber}`,
          displayName: `AI Rival ${seatNumber}`,
          connected: true,
          isAI: true,
        }
      }

      if (mode === 'human') {
        const exactHuman = connectedHumanBySeat.get(seatNumber)
        if (exactHuman) {
          connectedHumanBySeat.delete(seatNumber)
          const consumedIndex = unusedConnectedHumans.findIndex((candidate) => candidate.seat === seatNumber)
          if (consumedIndex >= 0) {
            unusedConnectedHumans.splice(consumedIndex, 1)
          }

          return {
            seat: seatNumber,
            userId: exactHuman.user_id,
            displayName: exactHuman.display_name,
            avatarKey: exactHuman.avatar_key,
            connected: true,
            isAI: false,
          }
        }

        return {
          seat: seatNumber,
          userId: `ai|rematch-${sessionId}-${seatNumber}`,
          displayName: `AI Rival ${seatNumber}`,
          connected: true,
          isAI: true,
        }
      }

      const exactHuman = connectedHumanBySeat.get(seatNumber)
      if (exactHuman) {
        connectedHumanBySeat.delete(seatNumber)
        const consumedIndex = unusedConnectedHumans.findIndex((candidate) => candidate.seat === seatNumber)
        if (consumedIndex >= 0) {
          unusedConnectedHumans.splice(consumedIndex, 1)
        }

        return {
          seat: seatNumber,
          userId: exactHuman.user_id,
          displayName: exactHuman.display_name,
          avatarKey: exactHuman.avatar_key,
          connected: true,
          isAI: false,
        }
      }

      const fallbackHuman = consumeConnectedHuman()
      if (fallbackHuman) {
        return {
          seat: seatNumber,
          userId: fallbackHuman.user_id,
          displayName: fallbackHuman.display_name,
          avatarKey: fallbackHuman.avatar_key,
          connected: true,
          isAI: false,
        }
      }

      return {
        seat: seatNumber,
        userId: `ai|rematch-${sessionId}-${seatNumber}`,
        displayName: `AI Rival ${seatNumber}`,
        connected: true,
        isAI: true,
      }
    })

    const activeHumanSeatCount = rematchAssignments.filter((seat) => !seat.isAI).length
    if (activeHumanSeatCount < 1) {
      sendJson(res, 400, {
        accepted: false,
        action: 'REMATCH',
        reason: 'REMATCH_REQUIRES_PLAYERS',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
      })
      return
    }

    const now = new Date().toISOString()

    for (const assignment of rematchAssignments) {
      const existingSeat = seatByNumber.get(assignment.seat)
      if (!existingSeat) {
        continue
      }

      const seatUpdate = await supabase
        .from('dice_player_seats')
        .update({
          user_id: assignment.userId,
          display_name: assignment.displayName,
          avatar_key: assignment.avatarKey ?? null,
          connected: assignment.connected,
          is_ai: assignment.isAI,
          updated_at: now,
        })
        .eq('session_id', sessionId)
        .eq('seat', assignment.seat)

      if (seatUpdate.error) {
        throw seatUpdate.error
      }
    }

    const nextGameState = createHybridGameState(
      rematchAssignments.map((assignment) => ({
        name: assignment.displayName,
        isAI: assignment.isAI,
      })),
    )

    const sessionUpdate = await supabase
      .from('dice_sessions')
      .update({
        status: 'active',
        game_state: nextGameState,
        version: session.version + 1,
        updated_at: now,
      })
      .eq('id', sessionId)
      .eq('version', session.version)
      .select('id, version, status, game_state, created_at, updated_at')
      .single()

    if (sessionUpdate.error || !sessionUpdate.data) {
      sendJson(res, 409, {
        accepted: false,
        action: 'REMATCH',
        reason: 'REMATCH_NOT_READY',
        requestId: body.clientRequestId ?? 'unknown',
        sessionId,
        latestVersion: session.version,
      })
      return
    }

    await supabase.from('dice_session_events').insert({
      session_id: sessionId,
      event_type: 'REMATCH_STARTED',
      payload: {
        actorUserId: user.userId,
        requestId: body.clientRequestId ?? null,
        seatPlan,
      },
      created_at: now,
    })

    const refreshedSeatsResult = await supabase
      .from('dice_player_seats')
      .select('seat, user_id, display_name, avatar_key, connected, is_ai')
      .eq('session_id', sessionId)
      .order('seat', { ascending: true })

    if (refreshedSeatsResult.error) {
      throw refreshedSeatsResult.error
    }

    const snapshot = mapSessionSnapshot(sessionUpdate.data as SessionRow, (refreshedSeatsResult.data ?? []) as SeatRow[])

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'REMATCH_STARTED',
      snapshot,
    })

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'SESSION_SNAPSHOT',
      snapshot,
    })

    sendJson(res, 200, {
      accepted: true,
      action: 'REMATCH',
      requestId: body.clientRequestId ?? `rematch-${sessionId}`,
      sessionId,
      latestVersion: (sessionUpdate.data as SessionRow).version,
      snapshot,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'SESSION_REMATCH_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
