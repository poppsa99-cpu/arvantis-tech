import { requireAdmin } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { fetchWithRetry } from '@/lib/fetch-retry'
import { NextRequest, NextResponse } from 'next/server'

const VALID_WORKFLOWS = ['motion-to-compel', 'compel-documents', 'motion-to-strike'] as const
type Workflow = (typeof VALID_WORKFLOWS)[number]

const VALID_STATUSES = ['processing', 'done', 'error'] as const

function getWebhookUrl(workflow: Workflow): string | undefined {
  switch (workflow) {
    case 'motion-to-compel':
      return process.env.N8N_MOTION_COMPEL_WEBHOOK_URL
    case 'compel-documents':
      return process.env.N8N_COMPEL_DOCS_WEBHOOK_URL
    case 'motion-to-strike':
      return process.env.N8N_WEBHOOK_URL
  }
}

/**
 * GET /api/admin/workflow-logs
 * Fetch workflow submission logs with optional filtering.
 *
 * Query params:
 *   workflow  — motion-to-compel | compel-documents | motion-to-strike
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
    // For motion-to-compel, query the dedicated table
    if (!workflow || workflow === 'motion-to-compel') {
      let query = admin
        .from('motion_to_compel_documents')
        .select('id, user_id, file_name, status, error_message, plaintiff_names, defendant_name, case_number, target_count, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) {
        query = query.eq('status', status)
      }

      const { data: docs, count, error } = await query

      if (error) {
        console.error('Failed to fetch motion-to-compel logs:', error.message)
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
      }

      // Enrich with user emails from profiles
      const userIds = [...new Set((docs || []).map(d => d.user_id).filter(Boolean))]
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

      const enriched = (docs || []).map(d => ({
        ...d,
        user_email: emailMap[d.user_id] || null,
        workflow: 'motion-to-compel',
      }))

      if (workflow === 'motion-to-compel') {
        return NextResponse.json({ data: enriched, total: count, limit, offset })
      }

      // If no workflow filter, we also fetch from analytics_events below
      // and merge results. For now return motion-to-compel results.
      // Fall through only if workflow is null and we want all.
    }

    // For other workflows (or all), query analytics_events
    let eventsQuery = admin
      .from('analytics_events')
      .select('id, user_id, event_type, workflow, error, metadata, duration_ms, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (workflow) {
      eventsQuery = eventsQuery.eq('workflow', workflow)
    } else {
      // When fetching all, only include workflow-related events
      eventsQuery = eventsQuery.in('workflow', [...VALID_WORKFLOWS])
    }

    if (status) {
      // Map status to event_type patterns
      const eventTypes: string[] = []
      if (status === 'processing') eventTypes.push('process_start')
      if (status === 'done') eventTypes.push('process_success')
      if (status === 'error') eventTypes.push('process_error', 'webhook_failure')
      if (eventTypes.length > 0) {
        eventsQuery = eventsQuery.in('event_type', eventTypes)
      }
    }

    const { data: events, count: eventsCount, error: eventsError } = await eventsQuery

    if (eventsError) {
      console.error('Failed to fetch analytics events:', eventsError.message)
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    // Enrich with user emails
    const eventUserIds = [...new Set((events || []).map(e => e.user_id).filter(Boolean))]
    let eventEmailMap: Record<string, string> = {}
    if (eventUserIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, email')
        .in('id', eventUserIds)

      if (profiles) {
        eventEmailMap = Object.fromEntries(profiles.map(p => [p.id, p.email]))
      }
    }

    const enrichedEvents = (events || []).map(e => ({
      ...e,
      user_email: eventEmailMap[e.user_id] || null,
    }))

    return NextResponse.json({ data: enrichedEvents, total: eventsCount, limit, offset })
  } catch (err) {
    console.error('Workflow logs error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/workflow-logs
 * Retry a failed submission by re-sending stored raw_text to the n8n webhook.
 *
 * Body: { id: string, workflow: 'motion-to-compel' | 'compel-documents' | 'motion-to-strike' }
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
    } else if (typedWorkflow === 'compel-documents') {
      // compel-documents saves to compel_documents_history but may not store raw_text
      // Check analytics_events for the original text in metadata
      const { data: event, error } = await admin
        .from('analytics_events')
        .select('id, metadata')
        .eq('id', id)
        .single()

      if (error || !event) {
        return NextResponse.json({ error: 'Event record not found' }, { status: 404 })
      }

      rawText = event.metadata?.raw_text || null
    } else if (typedWorkflow === 'motion-to-strike') {
      // motion-to-strike saves to processed_documents but may not store raw_text
      const { data: event, error } = await admin
        .from('analytics_events')
        .select('id, metadata')
        .eq('id', id)
        .single()

      if (error || !event) {
        return NextResponse.json({ error: 'Event record not found' }, { status: 404 })
      }

      rawText = event.metadata?.raw_text || null
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
