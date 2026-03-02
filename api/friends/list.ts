import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'

interface FriendListEntry {
  userId: string
  displayName: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    methodNotAllowed(req, res)
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()

    const edgesResult = await supabase
      .from('dice_friend_edges')
      .select('requester_user_id, addressee_user_id, status, updated_at')

    if (edgesResult.error) {
      throw edgesResult.error
    }

    const allEdges = edgesResult.data ?? []
    const relatedEdges = allEdges.filter((row) => {
      const requester = row.requester_user_id as string | undefined
      const addressee = row.addressee_user_id as string | undefined
      return requester === user.userId || addressee === user.userId
    })

    const relatedUserIds = new Set<string>()
    relatedEdges.forEach((edge) => {
      const requester = edge.requester_user_id as string
      const addressee = edge.addressee_user_id as string
      if (requester !== user.userId) {
        relatedUserIds.add(requester)
      }
      if (addressee !== user.userId) {
        relatedUserIds.add(addressee)
      }
    })

    const profilesResult = await supabase
      .from('dice_player_profiles')
      .select('user_id, display_name')

    if (profilesResult.error) {
      throw profilesResult.error
    }

    const displayNameByUserId = new Map<string, string>()
    ;(profilesResult.data ?? []).forEach((row) => {
      const profileUserId = row.user_id as string | undefined
      const displayName = row.display_name as string | undefined
      if (profileUserId && displayName) {
        displayNameByUserId.set(profileUserId, displayName)
      }
    })

    const toEntry = (otherUserId: string): FriendListEntry => ({
      userId: otherUserId,
      displayName: displayNameByUserId.get(otherUserId) ?? `Pilot-${otherUserId.slice(-4).toUpperCase()}`,
    })

    const friends: FriendListEntry[] = []
    const incomingRequests: FriendListEntry[] = []
    const outgoingRequests: FriendListEntry[] = []
    const blocked: FriendListEntry[] = []

    relatedEdges.forEach((edge) => {
      const requester = edge.requester_user_id as string
      const addressee = edge.addressee_user_id as string
      const status = edge.status as string
      const otherUserId = requester === user.userId ? addressee : requester

      if (!relatedUserIds.has(otherUserId)) {
        return
      }

      if (status === 'accepted') {
        if (!friends.some((entry) => entry.userId === otherUserId)) {
          friends.push(toEntry(otherUserId))
        }
        return
      }

      if (status === 'blocked') {
        if (!blocked.some((entry) => entry.userId === otherUserId)) {
          blocked.push(toEntry(otherUserId))
        }
        return
      }

      if (status === 'pending') {
        if (requester === user.userId) {
          if (!outgoingRequests.some((entry) => entry.userId === otherUserId)) {
            outgoingRequests.push(toEntry(otherUserId))
          }
        } else if (!incomingRequests.some((entry) => entry.userId === otherUserId)) {
          incomingRequests.push(toEntry(otherUserId))
        }
      }
    })

    sendJson(res, 200, {
      friends,
      incomingRequests,
      outgoingRequests,
      blocked,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'FRIEND_LIST_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
