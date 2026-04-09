import { getSupabaseAdmin } from '@/lib/supabase/admin'

export type EventType =
  | 'file_upload'
  | 'extract_success'
  | 'extract_error'
  | 'process_success'
  | 'process_error'
  | 'download'
  | 'defense_reassign'
  | 'motion_compel_edit'
  | 'webhook_retry'
  | 'webhook_failure'

interface LogEventParams {
  userId: string
  event: EventType
  workflow: 'motion-to-strike' | 'motion-to-compel' | 'compel-documents'
  metadata?: Record<string, unknown>
  error?: string
  durationMs?: number
}

/**
 * Silent event logger. Never throws — fires and forgets.
 * All events stored in analytics_events table.
 */
export async function logEvent(params: LogEventParams): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    await admin.from('analytics_events').insert({
      user_id: params.userId,
      event_type: params.event,
      workflow: params.workflow,
      metadata: params.metadata || {},
      error_message: params.error || null,
      duration_ms: params.durationMs || null,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    // Never fail the main request — just log to console
    console.error('[analytics] Failed to log event:', params.event, err)
  }
}

/**
 * Log an AI-vs-human diff when a lawyer corrects the AI output.
 * Stored alongside the event for training data.
 */
export async function logDiff(params: {
  userId: string
  workflow: 'motion-to-strike' | 'motion-to-compel' | 'compel-documents'
  field: string
  aiValue: unknown
  humanValue: unknown
  context?: Record<string, unknown>
}): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    await admin.from('analytics_events').insert({
      user_id: params.userId,
      event_type: 'ai_correction' as string,
      workflow: params.workflow,
      metadata: {
        field: params.field,
        ai_value: params.aiValue,
        human_value: params.humanValue,
        ...params.context,
      },
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[analytics] Failed to log diff:', params.field, err)
  }
}
