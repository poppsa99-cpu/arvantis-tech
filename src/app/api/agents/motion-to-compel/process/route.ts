import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { fetchWithRetry } from '@/lib/fetch-retry'
import { logEvent } from '@/lib/analytics'
import { NextRequest, NextResponse } from 'next/server'

export interface MotionTarget {
  targetName: string
  targetTitle: string
  targetPronoun: 'he' | 'she' | 'they'
  crTestimony: string
  reasonForCompelling: string
}

export interface MotionToCompelData {
  plaintiffNames: string[]
  defendantName: string
  caseNumber: string
  circuitNumber: string
  county: string
  corporateRepName: string
  corporateRepDepositionDate: string
  targets: MotionTarget[]
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

  const n8nUrl = process.env.N8N_MOTION_COMPEL_WEBHOOK_URL
  if (!n8nUrl) {
    return NextResponse.json({ error: 'N8N_MOTION_COMPEL_WEBHOOK_URL not configured' }, { status: 500 })
  }

  const adminSupabase = getSupabaseAdmin()

  // Save submission immediately so we have it even if n8n fails
  let docRecordId: string | null = null
  try {
    const { data: insertData } = await adminSupabase.from('motion_to_compel_documents').insert({
      user_id: user.id,
      file_name: fileName,
      raw_text: text,
      status: 'processing',
    }).select('id').single()
    docRecordId = insertData?.id || null
  } catch (err) {
    console.error('Failed to save initial motion-to-compel record:', err)
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
    console.error('n8n motion-to-compel webhook failed after retries:', err)
    logEvent({ userId: user.id, event: 'webhook_failure', workflow: 'motion-to-compel', error: errorMsg, durationMs: Date.now() - startTime, metadata: { textLength: text.length } })

    if (docRecordId) {
      await adminSupabase.from('motion_to_compel_documents').update({
        status: 'error',
        error_message: `Webhook failed: ${errorMsg}`,
      }).eq('id', docRecordId).then(() => {})
    }

    return NextResponse.json({ error: 'Processing service unavailable. Please try again.' }, { status: 502 })
  }

  if (!n8nRes.ok) {
    const errText = await n8nRes.text()
    console.error('n8n motion-to-compel returned error:', n8nRes.status, errText)
    logEvent({ userId: user.id, event: 'process_error', workflow: 'motion-to-compel', error: errText, durationMs: Date.now() - startTime, metadata: { textLength: text.length, httpStatus: n8nRes.status } })

    if (docRecordId) {
      await adminSupabase.from('motion_to_compel_documents').update({
        status: 'error',
        error_message: `n8n error ${n8nRes.status}: ${errText.slice(0, 2000)}`,
      }).eq('id', docRecordId).then(() => {})
    }

    return NextResponse.json({ error: `Processing failed: ${errText}` }, { status: 502 })
  }

  const result: MotionToCompelData = await n8nRes.json()

  if (!result.targets || result.targets.length === 0) {
    if (docRecordId) {
      await adminSupabase.from('motion_to_compel_documents').update({
        status: 'error',
        error_message: 'No deposition targets found in the document',
        n8n_response: result,
      }).eq('id', docRecordId).then(() => {})
    }
    return NextResponse.json({ error: 'No deposition targets found in the document' }, { status: 422 })
  }

  // Update record with successful result
  if (docRecordId) {
    try {
      await adminSupabase.from('motion_to_compel_documents').update({
        status: 'done',
        plaintiff_names: result.plaintiffNames,
        defendant_name: result.defendantName,
        case_number: result.caseNumber,
        circuit_number: result.circuitNumber,
        county: result.county,
        corporate_rep_name: result.corporateRepName,
        corporate_rep_deposition_date: result.corporateRepDepositionDate,
        targets: result.targets,
        target_count: result.targets.length,
        n8n_response: result,
      }).eq('id', docRecordId)
    } catch (err) {
      console.error('Failed to update motion-to-compel document:', err)
    }
  }

  logEvent({ userId: user.id, event: 'process_success', workflow: 'motion-to-compel', durationMs: Date.now() - startTime, metadata: { targetCount: result.targets?.length, plaintiff: result.plaintiffNames?.join(', '), defendant: result.defendantName } })
  return NextResponse.json(result)
}
