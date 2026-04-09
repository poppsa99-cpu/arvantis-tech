import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { fetchWithRetry } from '@/lib/fetch-retry'
import { logEvent } from '@/lib/analytics'
import { NextRequest, NextResponse } from 'next/server'

export interface DocumentRequest {
  whatTestified: string
  whatRequested: string
}

export interface CompelDocumentsData {
  plaintiffNames: string[]
  defendantName: string
  caseNumber: string
  circuitNumber: string
  county: string
  deponentName: string
  deponentTitle: string
  deponentPronoun: 'he' | 'she' | 'they'
  depositionDate: string
  documentRequests: DocumentRequest[]
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const { text } = await request.json()
  if (!text) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  const n8nUrl = process.env.N8N_COMPEL_DOCS_WEBHOOK_URL
  if (!n8nUrl) {
    return NextResponse.json({ error: 'N8N_COMPEL_DOCS_WEBHOOK_URL not configured' }, { status: 500 })
  }

  let n8nRes: Response
  try {
    n8nRes = await fetchWithRetry(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch (err) {
    console.error('n8n compel-documents webhook failed after retries:', err)
    logEvent({ userId: user.id, event: 'webhook_failure', workflow: 'compel-documents', error: String(err), durationMs: Date.now() - startTime, metadata: { textLength: text.length } })
    return NextResponse.json({ error: 'Processing service unavailable. Please try again.' }, { status: 502 })
  }

  if (!n8nRes.ok) {
    const errText = await n8nRes.text()
    console.error('n8n compel-documents returned error:', n8nRes.status, errText)
    logEvent({ userId: user.id, event: 'process_error', workflow: 'compel-documents', error: errText, durationMs: Date.now() - startTime, metadata: { textLength: text.length, httpStatus: n8nRes.status } })
    return NextResponse.json({ error: `Processing failed: ${errText}` }, { status: 502 })
  }

  const result: CompelDocumentsData = await n8nRes.json()

  if (!result.documentRequests || result.documentRequests.length === 0) {
    return NextResponse.json({ error: 'No document requests found in the email' }, { status: 422 })
  }

  // Save to Supabase for history (non-blocking)
  try {
    const admin = getSupabaseAdmin()
    await admin.from('compel_documents_history').insert({
      user_id: user.id,
      plaintiff_names: result.plaintiffNames,
      defendant_name: result.defendantName,
      case_number: result.caseNumber,
      circuit_number: result.circuitNumber,
      county: result.county,
      deponent_name: result.deponentName,
      deponent_title: result.deponentTitle,
      deposition_date: result.depositionDate,
      document_requests: result.documentRequests,
      request_count: result.documentRequests.length,
    })
  } catch (err) {
    console.error('Failed to save compel-documents history:', err)
  }

  logEvent({ userId: user.id, event: 'process_success', workflow: 'compel-documents', durationMs: Date.now() - startTime, metadata: { requestCount: result.documentRequests.length, plaintiff: result.plaintiffNames?.join(', '), defendant: result.defendantName, deponent: result.deponentName } })
  return NextResponse.json(result)
}
