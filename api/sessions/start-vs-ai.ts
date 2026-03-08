import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'
import { publishSessionRealtimeEventBestEffort } from '../_lib/realtime.js'
import { mapSessionSnapshot, type SeatRow, type SessionRow } from '../_lib/sessionSnapshot.js'
import { createHybridGameState, createVoyageOnlineSeatState } from '../_lib/serverGameState.js'
import { resolveUserProfileIdentity } from '../_lib/displayName.js'
import { DEFAULT_PLAYER_AVATAR_KEY } from '../../src/multiplayer/avatarCatalog.js'
import type { OnlineGameSlug } from '../../src/multiplayer/types.js'
import type { VoyageHomeAiProfile } from '../../src/voyageHome/types.js'
import { isMissingGameSlugColumnError } from '../_lib/gameSlugCompat.js'

interface StartVsAiBody {
  aiSlug?: string
  gameSlug?: OnlineGameSlug
}

const AI_SLUG_TO_VOYAGE_PROFILE: Record<string, VoyageHomeAiProfile> = {
  zeus: 'posei',
  odys: 'odys',
  posey: 'posei',
  posei: 'posei',
  poly: 'poly',
  polly: 'poly',
}

const resolveGameSlug = (value: unknown): OnlineGameSlug =>
  value === 'voyage-home' ? 'voyage-home' : 'space-race'

const getErrorDetail = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: string
      detail?: string
      hint?: string
      code?: string
      error_description?: string
    }

    return (
      candidate.message ||
      candidate.detail ||
      candidate.hint ||
      candidate.error_description ||
      candidate.code ||
      JSON.stringify(error)
    )
  }

  return String(error)
}

const normalizeAiSlug = (value: unknown): string => {
  if (typeof value !== 'string') {
    return 'rival'
  }

  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32)
  return cleaned || 'rival'
}

const toAiDisplayName = (aiSlug: string): string => {
  const parts = aiSlug
    .split('-')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))

  if (parts.length === 0) {
    return 'AI Rival'
  }

  return `AI ${parts.join(' ')}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const body = await readJsonBody<StartVsAiBody>(req)
    const aiSlug = normalizeAiSlug(body.aiSlug)
    const gameSlug = resolveGameSlug(body.gameSlug)

    const supabase = getSupabaseAdminClient()
    const identity = await resolveUserProfileIdentity(supabase, user)

    const disconnectExistingSeats = await supabase
      .from('dice_player_seats')
      .update({
        connected: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.userId)
      .eq('connected', true)
      .eq('is_ai', false)

    if (disconnectExistingSeats.error) {
      throw disconnectExistingSeats.error
    }

    const sessionId = crypto.randomUUID()
    const now = new Date().toISOString()
    const aiUserId = `ai|online-${sessionId}-${aiSlug}`
    const aiDisplayName = toAiDisplayName(aiSlug)

    const nextGameState =
      gameSlug === 'voyage-home'
        ? createVoyageOnlineSeatState([
            {
              name: identity.displayName,
              isAI: false,
            },
            {
              name: aiDisplayName,
              isAI: true,
              aiProfile: AI_SLUG_TO_VOYAGE_PROFILE[aiSlug] ?? 'odys',
            },
          ])
        : createHybridGameState([
            {
              name: identity.displayName,
              isAI: false,
            },
            {
              name: aiDisplayName,
              isAI: true,
            },
          ])

    let sessionInsert = await supabase
      .from('dice_sessions')
      .insert({
        id: sessionId,
        game_slug: gameSlug,
        status: 'active',
        version: 1,
        game_state: nextGameState,
        created_at: now,
        updated_at: now,
      })

    if (sessionInsert.error && isMissingGameSlugColumnError(sessionInsert.error)) {
      sessionInsert = await supabase
        .from('dice_sessions')
        .insert({
          id: sessionId,
          status: 'active',
          version: 1,
          game_state: nextGameState,
          created_at: now,
          updated_at: now,
        })
    }

    if (sessionInsert.error) {
      throw sessionInsert.error
    }

    const sessionRead = await supabase
      .from('dice_sessions')
      .select('id, version, status, game_state, created_at, updated_at')
      .eq('id', sessionId)
      .single()

    if (sessionRead.error || !sessionRead.data) {
      throw sessionRead.error ?? new Error('SESSION_READ_FAILED')
    }

    const seatInsert = await supabase.from('dice_player_seats').insert([
      {
        session_id: sessionId,
        seat: 1,
        user_id: user.userId,
        display_name: identity.displayName,
        avatar_key: identity.avatarKey,
        connected: true,
        is_ai: false,
        created_at: now,
        updated_at: now,
      },
      {
        session_id: sessionId,
        seat: 2,
        user_id: aiUserId,
        display_name: aiDisplayName,
        avatar_key: DEFAULT_PLAYER_AVATAR_KEY,
        connected: true,
        is_ai: true,
        created_at: now,
        updated_at: now,
      },
    ])

    if (seatInsert.error) {
      throw seatInsert.error
    }

    const seats: SeatRow[] = [
      {
        seat: 1,
        user_id: user.userId,
        display_name: identity.displayName,
        avatar_key: identity.avatarKey,
        connected: true,
        is_ai: false,
      },
      {
        seat: 2,
        user_id: aiUserId,
        display_name: aiDisplayName,
        avatar_key: DEFAULT_PLAYER_AVATAR_KEY,
        connected: true,
        is_ai: true,
      },
    ]

    const snapshot = mapSessionSnapshot({
      ...(sessionRead.data as SessionRow),
      game_slug: gameSlug,
    }, seats)

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'MATCH_FOUND',
      sessionId,
    })

    await publishSessionRealtimeEventBestEffort(sessionId, {
      type: 'SESSION_SNAPSHOT',
      snapshot,
    })

    sendJson(res, 200, {
      started: true,
      sessionId,
      aiSlug,
      gameSlug,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'START_VS_AI_FAILED',
      detail: getErrorDetail(error),
    })
  }
}
