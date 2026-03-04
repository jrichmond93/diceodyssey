import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'

interface PresenceEntry {
  userId: string
  displayName: string
  avatarKey?: string
  status: 'Available' | 'In Lobby' | 'In Match'
  sessionId?: string
}

const LOBBY_STALE_WINDOW_MS = 30 * 1000
const ACTIVE_STALE_WINDOW_MS = 15 * 60 * 1000

type PresenceVisibility = 'discoverable' | 'friends-only' | 'private'

type SupabaseLikeError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

const getHeader = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

const getFallbackDisplayName = (userId: string): string => `Pilot-${userId.slice(-4).toUpperCase()}`

const normalizeVisibility = (value: unknown): PresenceVisibility => {
  if (value === 'discoverable' || value === 'friends-only' || value === 'private') {
    return value
  }

  return 'discoverable'
}

const isMissingColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const typedError = error as SupabaseLikeError
  if (typedError.code === '42703') {
    return true
  }

  const message = `${typedError.message ?? ''} ${typedError.details ?? ''} ${typedError.hint ?? ''}`.toLowerCase()
  return message.includes('column') && message.includes('does not exist')
}

const parseTimestamp = (value: unknown): number | null => {
  if (typeof value !== 'string' || !value) {
    return null
  }

  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

const isRecentEnough = (value: unknown, nowMs: number, staleWindowMs: number): boolean => {
  const timestamp = parseTimestamp(value)
  if (timestamp === null) {
    return true
  }

  return nowMs - timestamp <= staleWindowMs
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    methodNotAllowed(req, res)
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()

    const [profilesResultWithVisibility, seatsResult, friendEdgesResult, invitesResult] = await Promise.all([
      supabase.from('dice_player_profiles').select('user_id, display_name, presence_visibility'),
      supabase.from('dice_player_seats').select('session_id, user_id, avatar_key, connected, is_ai, updated_at'),
      supabase.from('dice_friend_edges').select('requester_user_id, addressee_user_id, status'),
      supabase
        .from('dice_party_invites')
        .select('id, session_id, from_user_id, to_user_id, status, expires_at, created_at'),
    ])

    let profilesResult = profilesResultWithVisibility
    if (profilesResultWithVisibility.error && isMissingColumnError(profilesResultWithVisibility.error)) {
      profilesResult = await supabase.from('dice_player_profiles').select('user_id, display_name')
    }

    if (profilesResult.error) {
      throw profilesResult.error
    }

    if (seatsResult.error) {
      throw seatsResult.error
    }

    if (friendEdgesResult.error) {
      throw friendEdgesResult.error
    }

    if (invitesResult.error) {
      throw invitesResult.error
    }

    const displayNameByUserId = new Map<string, string>()
    const visibilityByUserId = new Map<string, PresenceVisibility>()
    ;(profilesResult.data ?? []).forEach((row) => {
      const profileUserId = row.user_id as string | undefined
      const displayName = row.display_name as string | undefined
      if (profileUserId && displayName) {
        displayNameByUserId.set(profileUserId, displayName)
      }

      if (profileUserId) {
        visibilityByUserId.set(profileUserId, normalizeVisibility((row as Record<string, unknown>).presence_visibility))
      }
    })

    const sessionStatusById = new Map<string, string>()
    const sessionUpdatedAtById = new Map<string, string | undefined>()
    const sessionsResult = await supabase.from('dice_sessions').select('id, status, updated_at')
    if (sessionsResult.error) {
      throw sessionsResult.error
    }

    ;(sessionsResult.data ?? []).forEach((row) => {
      const sessionId = row.id as string | undefined
      const status = row.status as string | undefined
      if (sessionId && status) {
        sessionStatusById.set(sessionId, status)
        sessionUpdatedAtById.set(sessionId, row.updated_at as string | undefined)
      }
    })

    const nowMs = Date.now()
    const activePresenceStatuses = new Set(['lobby', 'active'])

    const acceptedFriends = new Set<string>()
    ;(friendEdgesResult.data ?? []).forEach((edge) => {
      if (edge.status !== 'accepted') {
        return
      }

      const requester = edge.requester_user_id as string | undefined
      const addressee = edge.addressee_user_id as string | undefined

      if (!requester || !addressee) {
        return
      }

      if (requester === user.userId) {
        acceptedFriends.add(addressee)
      } else if (addressee === user.userId) {
        acceptedFriends.add(requester)
      }
    })

    const canViewerSeeUser = (targetUserId: string): boolean => {
      const visibility = visibilityByUserId.get(targetUserId) ?? 'discoverable'
      if (visibility === 'discoverable') {
        return true
      }

      if (visibility === 'private') {
        return false
      }

      return acceptedFriends.has(targetUserId)
    }

    const connectedHumanSeats = (seatsResult.data ?? []).filter(
      (seat) => {
        if (seat.connected !== true || seat.is_ai === true) {
          return false
        }

        const sessionId = typeof seat.session_id === 'string' ? seat.session_id : undefined
        if (!sessionId) {
          return false
        }

        const sessionStatus = sessionStatusById.get(sessionId)
        if (!sessionStatus || !activePresenceStatuses.has(sessionStatus)) {
          return false
        }

        const seatRecent = isRecentEnough(
          (seat as Record<string, unknown>).updated_at,
          nowMs,
          sessionStatus === 'lobby' ? LOBBY_STALE_WINDOW_MS : ACTIVE_STALE_WINDOW_MS,
        )

        if (sessionStatus === 'lobby') {
          return seatRecent
        }

        const sessionRecent = isRecentEnough(
          sessionUpdatedAtById.get(sessionId),
          nowMs,
          ACTIVE_STALE_WINDOW_MS,
        )

        return sessionRecent && seatRecent
      },
    )

    const uniqueOnlineUserIds = new Set<string>()
    connectedHumanSeats.forEach((seat) => {
      if (typeof seat.user_id === 'string') {
        uniqueOnlineUserIds.add(seat.user_id)
      }
    })

    const searchingUserIds = new Set<string>()
    connectedHumanSeats.forEach((seat) => {
      const sessionId = typeof seat.session_id === 'string' ? seat.session_id : undefined
      if (!sessionId) {
        return
      }

      if (
        sessionStatusById.get(sessionId) === 'lobby' &&
        typeof seat.user_id === 'string'
      ) {
        searchingUserIds.add(seat.user_id)
      }
    })

    const availableNowEntries: PresenceEntry[] = connectedHumanSeats
      .filter((seat) => seat.user_id !== user.userId)
      .filter((seat) => typeof seat.user_id === 'string')
      .map((seat) => {
        const sessionId = seat.session_id as string | undefined
        const seatUserId = seat.user_id as string
        const sessionStatus = sessionId ? sessionStatusById.get(sessionId) : undefined

        return {
          userId: seatUserId,
          displayName: displayNameByUserId.get(seatUserId) ?? getFallbackDisplayName(seatUserId),
          avatarKey: typeof (seat as Record<string, unknown>).avatar_key === 'string'
            ? ((seat as Record<string, unknown>).avatar_key as string)
            : undefined,
          status:
            sessionStatus === 'active'
              ? 'In Match'
              : sessionStatus === 'lobby'
                ? 'In Lobby'
                : 'Available',
          sessionId,
        }
      })
      .filter((entry) => entry.status === 'In Lobby' && Boolean(entry.sessionId))

    const deduplicatedAvailableNowEntries = Array.from(
      availableNowEntries.reduce<Map<string, PresenceEntry>>((accumulator, entry) => {
        if (!accumulator.has(entry.userId)) {
          accumulator.set(entry.userId, entry)
        }

        return accumulator
      }, new Map()),
    )
      .map(([, entry]) => entry)
      .slice(0, 10)

    const friendsOnline = Array.from(acceptedFriends)
      .filter((friendUserId) => uniqueOnlineUserIds.has(friendUserId))
      .map((friendUserId) => ({
        userId: friendUserId,
        displayName: displayNameByUserId.get(friendUserId) ?? getFallbackDisplayName(friendUserId),
      }))
      .slice(0, 10)

    const now = Date.now()
    const joinNextGame = (invitesResult.data ?? [])
      .filter((invite) => invite.to_user_id === user.userId)
      .filter((invite) => invite.status === 'pending')
      .filter((invite) => new Date(invite.expires_at as string).getTime() > now)
      .map((invite) => {
        const fromUserId = invite.from_user_id as string | undefined
        return {
          id: invite.id,
          sessionId: invite.session_id,
          fromDisplayName: fromUserId
            ? displayNameByUserId.get(fromUserId) ?? getFallbackDisplayName(fromUserId)
            : 'Unknown',
          expiresAt: invite.expires_at,
        }
      })
      .slice(0, 10)

    const region =
      getHeader(req.headers['x-vercel-ip-country-region']) ??
      getHeader(req.headers['x-vercel-ip-country']) ??
      'Global'

    sendJson(res, 200, {
      presence: {
        viewerVisibility: visibilityByUserId.get(user.userId) ?? 'discoverable',
        playersOnlineNow: uniqueOnlineUserIds.size,
        playersSearchingNow: searchingUserIds.size,
        estimatedWaitSeconds: 12,
        region,
        availableNow: deduplicatedAvailableNowEntries,
        friendsOnline,
        joinNextGame,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'PRESENCE_REQUEST_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
