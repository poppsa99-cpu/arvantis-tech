import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { fetchWithRetry } from '@/lib/fetch-retry'
import { logEvent } from '@/lib/analytics'
import { autoDiagnose } from '@/lib/auto-diagnose'
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

  const { text, fileName = 'unknown' } = await request.json()

  if (!text) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  const n8nUrl = process.env.N8N_COMPEL_DOCS_WEBHOOK_URL
  if (!n8nUrl) {
    return NextResponse.json({ error: 'N8N_COMPEL_DOCS_WEBHOOK_URL not configured' }, { status: 500 })
  }

  const adminSupabase = getSupabaseAdmin()

  // Save submission immediately so we have it even if n8n fails
  let docRecordId: string | null = null
  try {
    const { data: insertData } = await adminSupabase.from('compel_documents_history').insert({
      user_id: user.id,
      file_name: fileName,
      raw_text: text,
      status: 'processing',
    }).select('id').single()
    docRecordId = insertData?.id || null
  } catch (err) {
    console.error('Failed to save initial compel-documents record:', err)
  }

  let n8nRes: Response
  try {
    n8nRes = await fetchWithRetry(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch (err) {
    const errorMsg = String(err)
    console.error('n8n compel-documents webhook failed after retries:', err)
    logEvent({ userId: user.id, event: 'webhook_failure', workflow: 'compel-documents', error: errorMsg, durationMs: Date.now() - startTime, metadata: { textLength: text.length } })

    if (docRecordId) {
      await adminSupabase.from('compel_documents_history').update({
        status: 'error',
        error_message: `Webhook failed: ${errorMsg}`,
      }).eq('id', docRecordId).then(() => {})
    }

    autoDiagnose({ workflow: 'compel-documents', errorMessage: `Webhook failed: ${errorMsg}`, fileName, rawText: text, docRecordId, webhookUrl: n8nUrl })
    return NextResponse.json({ error: 'Processing service unavailable. Please try again.' }, { status: 502 })
  }

  if (!n8nRes.ok) {
    const errText = await n8nRes.text()
    console.error('n8n compel-documents returned error:', n8nRes.status, errText)
    logEvent({ userId: user.id, event: 'process_error', workflow: 'compel-documents', error: errText, durationMs: Date.now() - startTime, metadata: { textLength: text.length, httpStatus: n8nRes.status } })

    if (docRecordId) {
      await adminSupabase.from('compel_documents_history').update({
        status: 'error',
        error_message: `n8n error ${n8nRes.status}: ${errText.slice(0, 2000)}`,
      }).eq('id', docRecordId).then(() => {})
    }

    autoDiagnose({ workflow: 'compel-documents', errorMessage: `n8n error ${n8nRes.status}: ${errText}`, fileName, rawText: text, docRecordId, webhookUrl: n8nUrl })
    return NextResponse.json({ error: `Processing failed: ${errText}` }, { status: 502 })
  }

  const result: CompelDocumentsData = await n8nRes.json()

  if (!result.documentRequests || result.documentRequests.length === 0) {
    if (docRecordId) {
      await adminSupabase.from('compel_documents_history').update({
        status: 'error',
        error_message: 'No document requests found in the email',
      }).eq('id', docRecordId).then(() => {})
    }
    autoDiagnose({ workflow: 'compel-documents', errorMessage: 'No document requests found in the email', fileName, rawText: text, docRecordId, webhookUrl: n8nUrl })
    return NextResponse.json({ error: 'No document requests found in the email' }, { status: 422 })
  }

  // Update record with successful result
  if (docRecordId) {
    try {
      await adminSupabase.from('compel_documents_history').update({
        status: 'done',
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
      }).eq('id', docRecordId)
    } catch (err) {
      console.error('Failed to update compel-documents record:', err)
    }
  }

  logEvent({ userId: user.id, event: 'process_success', workflow: 'compel-documents', durationMs: Date.now() - startTime, metadata: { requestCount: result.documentRequests.length, plaintiff: result.plaintiffNames?.join(', '), defendant: result.defendantName, deponent: result.deponentName } })
  return NextResponse.json(result)
}
