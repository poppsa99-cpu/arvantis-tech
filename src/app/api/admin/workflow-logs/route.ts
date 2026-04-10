import { requireAdmin } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { fetchWithRetry } from '@/lib/fetch-retry'
import { NextRequest, NextResponse } from 'next/server'

const VALID_WORKFLOWS = ['motion-to-compel', 'motion-to-strike'] as const
type Workflow = (typeof VALID_WORKFLOWS)[number]

const VALID_STATUSES = ['processing', 'done', 'error'] as const

function getWebhookUrl(workflow: Workflow): string | undefined {
  switch (workflow) {
    case 'motion-to-compel':
      return process.env.N8N_MOTION_COMPEL_WEBHOOK_URL
    case 'motion-to-strike':
      return process.env.N8N_WEBHOOK_URL
  }
}

/** Normalized log entry shape that the frontend expects */
interface NormalizedLog {
  id: string
  created_at: string
  user_email: string | null
  workflow: string
  file_name: string | null
  status: 'processing' | 'done' | 'error'
  raw_text?: string | null
  error_message?: string | null
  n8n_response?: unknown
}

/**
 * GET /api/admin/workflow-logs
 * Fetch workflow submission logs with optional filtering.
 *
 * Query params:
 *   workflow  — motion-to-compel | motion-to-strike
 *   status    — processing | done | error
 *   limit     — number (default 50)
 *   offset    — number (default 0)
 */
export async function GET(request: NextRequest) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const workflow = searchParams.get('workflow') as Workflow | null
  const status = searchParams.get('status')
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

  // Validate params
  if (workflow && !VALID_WORKFLOWS.includes(workflow)) {
    return NextResponse.json({ error: `Invalid workflow. Must be one of: ${VALID_WORKFLOWS.join(', ')}` }, { status: 400 })
  }
  if (status && !(VALID_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  try {
    const allLogs: NormalizedLog[] = []

    // ── Motion-to-compel logs from dedicated table ──
    if (!workflow || workflow === 'motion-to-compel') {
      let query = admin
        .from('motion_to_compel_documents')
        .select('id, user_id, file_name, raw_text, status, error_message, n8n_response, plaintiff_names, defendant_name, case_number, target_count, created_at')
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data: docs, error } = await query

      if (error) {
        console.error('Failed to fetch motion-to-compel logs:', error.message)
      } else if (docs && docs.length > 0) {
        // Enrich with user emails
        const userIds = [...new Set(docs.map(d => d.user_id).filter(Boolean))]
        let emailMap: Record<string, string> = {}
        if (userIds.length > 0) {
          const { data: profiles } = await admin
            .from('profiles')
            .select('id, email')
            .in('id', userIds)
          if (profiles) {
            emailMap = Object.fromEntries(profiles.map(p => [p.id, p.email]))
          }
        }

        for (const d of docs) {
          allLogs.push({
            id: d.id,
            created_at: d.created_at,
            user_email: emailMap[d.user_id] || null,
            workflow: 'motion-to-compel',
            file_name: d.file_name || null,
            status: d.status,
            raw_text: d.raw_text || null,
            error_message: d.error_message || null,
            n8n_response: d.n8n_response || null,
          })
        }
      }
    }

    // ── Motion-to-strike logs from processed_documents ──
    if (!workflow || workflow === 'motion-to-strike') {
      let query = admin
        .from('processed_documents')
        .select('id, user_id, file_name, raw_text, plaintiff_name, defendant_name, case_number, court, total_defenses, matched, flagged, status, error_message, n8n_response, created_at')
        .order('created_at', { ascending: false })

      if (status) {
        // processed_documents uses 'complete' / 'needs_review' instead of 'done'
        if (status === 'done') {
          query = query.in('status', ['complete', 'needs_review'])
        } else if (status === 'error') {
          query = query.eq('status', 'error')
        } else if (status === 'processing') {
          query = query.eq('status', 'processing')
        }
      }

      const { data: docs, error } = await query

      if (error) {
        console.error('Failed to fetch motion-to-strike logs:', error.message)
      } else if (docs && docs.length > 0) {
        // Enrich with user emails
        const userIds = [...new Set(docs.map(d => d.user_id).filter(Boolean))]
        let emailMap: Record<string, string> = {}
        if (userIds.length > 0) {
          const { data: profiles } = await admin
            .from('profiles')
            .select('id, email')
            .in('id', userIds)
          if (profiles) {
            emailMap = Object.fromEntries(profiles.map(p => [p.id, p.email]))
          }
        }

        for (const d of docs) {
          // Map processed_documents status to the normalized status
          let normalizedStatus: 'processing' | 'done' | 'error' = 'done'
          if (d.status === 'error') normalizedStatus = 'error'
          else if (d.status === 'processing') normalizedStatus = 'processing'

          allLogs.push({
            id: d.id,
            created_at: d.created_at,
            user_email: emailMap[d.user_id] || null,
            workflow: 'motion-to-strike',
            file_name: d.file_name
              || (d.plaintiff_name && d.defendant_name ? `${d.plaintiff_name} v. ${d.defendant_name}` : null)
              || d.case_number
              || null,
            status: normalizedStatus,
            raw_text: d.raw_text || null,
            error_message: d.error_message || null,
            n8n_response: d.n8n_response || null,
          })
        }
      }

      // Also check analytics_events for motion-to-strike errors that may not be in processed_documents
      let eventsQuery = admin
        .from('analytics_events')
        .select('id, user_id, event_type, workflow, error_message, metadata, duration_ms, created_at')
        .eq('workflow', 'motion-to-strike')
        .in('event_type', ['process_error', 'webhook_failure'])
        .order('created_at', { ascending: false })

      // Only include errors if status filter allows it
      if (status && status !== 'error') {
        eventsQuery = eventsQuery.limit(0) // skip — only errors live here
      }

      const { data: errorEvents } = await eventsQuery

      if (errorEvents && errorEvents.length > 0) {
        const userIds = [...new Set(errorEvents.map(e => e.user_id).filter(Boolean))]
        let emailMap: Record<string, string> = {}
        if (userIds.length > 0) {
          const { data: profiles } = await admin
            .from('profiles')
            .select('id, email')
            .in('id', userIds)
          if (profiles) {
            emailMap = Object.fromEntries(profiles.map(p => [p.id, p.email]))
          }
        }

        for (const e of errorEvents) {
          allLogs.push({
            id: e.id,
            created_at: e.created_at,
            user_email: emailMap[e.user_id] || null,
            workflow: 'motion-to-strike',
            file_name: (e.metadata as Record<string, unknown>)?.fileName as string || null,
            status: 'error',
            raw_text: null,
            error_message: e.error_message || null,
            n8n_response: null,
          })
        }
      }
    }

    // Sort all logs by created_at descending and apply pagination
    allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const paged = allLogs.slice(offset, offset + limit)

    return NextResponse.json({
      logs: paged,
      total: allLogs.length,
      limit,
      offset,
    })
  } catch (err) {
    console.error('Workflow logs error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/workflow-logs
 * Retry a failed submission by re-sending stored raw_text to the n8n webhook.
 *
 * Body: { id: string, workflow: 'motion-to-compel' | 'motion-to-strike' }
 */
export async function POST(request: NextRequest) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { id?: string; workflow?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, workflow } = body

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 })
  }
  if (!workflow || !VALID_WORKFLOWS.includes(workflow as Workflow)) {
    return NextResponse.json({ error: `Invalid workflow. Must be one of: ${VALID_WORKFLOWS.join(', ')}` }, { status: 400 })
  }

  const typedWorkflow = workflow as Workflow
  const webhookUrl = getWebhookUrl(typedWorkflow)
  if (!webhookUrl) {
    return NextResponse.json({ error: `Webhook URL not configured for ${workflow}` }, { status: 500 })
  }

  const admin = getSupabaseAdmin()

  try {
    // Fetch the stored raw_text based on workflow type
    let rawText: string | null = null

    if (typedWorkflow === 'motion-to-compel') {
      const { data: doc, error } = await admin
        .from('motion_to_compel_documents')
        .select('id, raw_text, status')
        .eq('id', id)
        .single()

      if (error || !doc) {
        return NextResponse.json({ error: 'Document record not found' }, { status: 404 })
      }
      rawText = doc.raw_text
    } else if (typedWorkflow === 'motion-to-strike') {
      // motion-to-strike may have raw_text in analytics_events metadata
      const { data: event, error } = await admin
        .from('analytics_events')
        .select('id, metadata')
        .eq('id', id)
        .single()

      if (error || !event) {
        return NextResponse.json({ error: 'Event record not found' }, { status: 404 })
      }

      rawText = (event.metadata as Record<string, unknown>)?.raw_text as string || null
    }

    if (!rawText) {
      return NextResponse.json({ error: 'No raw text found for this record. Cannot retry.' }, { status: 422 })
    }

    // Mark as processing before retry
    if (typedWorkflow === 'motion-to-compel') {
      await admin
        .from('motion_to_compel_documents')
        .update({ status: 'processing', error_message: null })
        .eq('id', id)
    }

    // Re-send to n8n webhook
    let n8nRes: Response
    try {
      n8nRes = await fetchWithRetry(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      })
    } catch (err) {
      const errorMsg = `Retry webhook failed: ${String(err)}`

      if (typedWorkflow === 'motion-to-compel') {
        await admin
          .from('motion_to_compel_documents')
          .update({ status: 'error', error_message: errorMsg })
          .eq('id', id)
      }

      return NextResponse.json({ error: 'Webhook unreachable during retry' }, { status: 502 })
    }

    if (!n8nRes.ok) {
      const errText = await n8nRes.text()
      const errorMsg = `Retry failed with status ${n8nRes.status}: ${errText.slice(0, 2000)}`

      if (typedWorkflow === 'motion-to-compel') {
        await admin
          .from('motion_to_compel_documents')
          .update({ status: 'error', error_message: errorMsg })
          .eq('id', id)
      }

      return NextResponse.json({ error: errorMsg }, { status: 502 })
    }

    const result = await n8nRes.json()

    // Update record with successful retry result
    if (typedWorkflow === 'motion-to-compel') {
      await admin
        .from('motion_to_compel_documents')
        .update({
          status: 'done',
          error_message: null,
          plaintiff_names: result.plaintiffNames,
          defendant_name: result.defendantName,
          case_number: result.caseNumber,
          circuit_number: result.circuitNumber,
          county: result.county,
          corporate_rep_name: result.corporateRepName,
          corporate_rep_deposition_date: result.corporateRepDepositionDate,
          targets: result.targets,
          target_count: result.targets?.length,
          n8n_response: result,
        })
        .eq('id', id)
    }

    return NextResponse.json({ success: true, result })
  } catch (err) {
    console.error('Workflow retry error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
