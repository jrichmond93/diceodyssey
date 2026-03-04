import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyRequestUser } from '../_lib/auth.js'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http.js'
import { getSupabaseAdminClient } from '../_lib/supabase.js'

interface InviteCodeBody {
  sessionId?: string
}

const TTL_MINUTES = 60

const fallbackCode = (): string => {
  const words = [
    'roll',
    'clash',
    'spin',
    'bot',
    'dash',
    'rush',
    'bolt',
    'zap',
    'flux',
    'guff',
    'void',
    'nova',
    'rift',
    'pulse',
    'core',
    'warp',
    'beam',
    'pip',
    'face',
    'blitz',
  ]

  const word = words[Math.floor(Math.random() * words.length)]
  const number = Math.max(1, Math.floor(Date.now() / 1000) % 1000000)
  return `${word}${number}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(req, res)
    return
  }

  sendJson(res, 410, {
    error: 'DIRECT_MATCH_DISABLED',
  })
  return

  const body = await readJsonBody<InviteCodeBody>(req)
  const sessionId = (body.sessionId ?? '').trim()

  if (!sessionId) {
    sendJson(res, 400, {
      error: 'INVALID_SESSION_ID',
    })
    return
  }

  try {
    const user = await verifyRequestUser(req)
    const supabase = getSupabaseAdminClient()

    const { data: seat, error: seatError } = await supabase
      .from('dice_player_seats')
      .select('seat, user_id')
      .eq('session_id', sessionId)
      .eq('user_id', user.userId)
      .maybeSingle()

    if (seatError) {
      throw seatError
    }

    if (!seat) {
      sendJson(res, 403, {
        error: 'NOT_IN_SESSION',
      })
      return
    }

    const { data: existingInvite, error: existingInviteError } = await supabase
      .from('dice_match_invites')
      .select('id, code, expires_at, status')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (existingInviteError) {
      throw existingInviteError
    }

    if (existingInvite) {
      sendJson(res, 200, {
        sessionId,
        code: existingInvite.code,
        expiresAt: existingInvite.expires_at,
      })
      return
    }

    await supabase
      .from('dice_match_invites')
      .update({
        status: 'expired',
      })
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .lte('expires_at', new Date().toISOString())

    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString()

    for (let attempt = 0; attempt < 8; attempt += 1) {
      let generatedCode = fallbackCode()

      const { data: rpcCode } = await supabase.rpc('dice_next_invite_code')
      if (typeof rpcCode === 'string' && rpcCode.trim()) {
        generatedCode = rpcCode.trim().toLowerCase()
      }

      const insertResult = await supabase
        .from('dice_match_invites')
        .insert({
          session_id: sessionId,
          code: generatedCode,
          created_by_user_id: user.userId,
          status: 'active',
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
        })
        .select('code, expires_at')
        .single()

      if (!insertResult.error && insertResult.data) {
        sendJson(res, 200, {
          sessionId,
          code: insertResult.data.code,
          expiresAt: insertResult.data.expires_at,
        })
        return
      }
    }

    sendJson(res, 500, {
      error: 'INVITE_CODE_GENERATION_FAILED',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
      })
      return
    }

    sendJson(res, 500, {
      error: 'INVITE_CODE_REQUEST_FAILED',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
