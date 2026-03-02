import type { RealtimeEvent } from '../../src/multiplayer/types.js'
import { getDiceSessionChannelTopic } from '../../src/multiplayer/types.js'
import { getSupabaseAdminClient } from './supabase.js'

const safeRemoveChannel = async (client: ReturnType<typeof getSupabaseAdminClient>, channel: unknown) => {
  try {
    if (channel && typeof channel === 'object' && 'unsubscribe' in channel) {
      await (channel as { unsubscribe: () => Promise<unknown> | unknown }).unsubscribe()
    }
  } catch {
    // best effort cleanup
  }

  try {
    if (channel && typeof channel === 'object' && 'topic' in channel) {
      await client.removeChannel(channel as never)
    }
  } catch {
    // best effort cleanup
  }
}

export const publishSessionRealtimeEvent = async (
  sessionId: string,
  event: RealtimeEvent,
): Promise<void> => {
  const supabase = getSupabaseAdminClient()
  const topic = getDiceSessionChannelTopic(sessionId)
  const channel = supabase.channel(topic)

  try {
    await channel.send({
      type: 'broadcast',
      event: event.type,
      payload: event,
    })
  } finally {
    await safeRemoveChannel(supabase, channel)
  }
}

export const publishSessionRealtimeEventBestEffort = async (
  sessionId: string,
  event: RealtimeEvent,
): Promise<void> => {
  try {
    await publishSessionRealtimeEvent(sessionId, event)
  } catch (error) {
    console.warn('Realtime publish failed', {
      sessionId,
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
