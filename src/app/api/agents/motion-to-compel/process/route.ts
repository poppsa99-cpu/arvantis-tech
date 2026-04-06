import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
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

  const { text } = await request.json()
  if (!text) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  const n8nUrl = process.env.N8N_MOTION_COMPEL_WEBHOOK_URL
  if (!n8nUrl) {
    return NextResponse.json({ error: 'N8N_MOTION_COMPEL_WEBHOOK_URL not configured' }, { status: 500 })
  }

  const n8nRes = await fetch(n8nUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!n8nRes.ok) {
    const errText = await n8nRes.text()
    return NextResponse.json({ error: `n8n error: ${errText}` }, { status: 502 })
  }

  const result: MotionToCompelData = await n8nRes.json()

  if (!result.targets || result.targets.length === 0) {
    return NextResponse.json({ error: 'No deposition targets found in the document' }, { status: 422 })
  }

  // Save to Supabase for history (non-blocking)
  try {
    const adminSupabase = getSupabaseAdmin()
    await adminSupabase.from('motion_to_compel_documents').insert({
      user_id: user.id,
      plaintiff_names: result.plaintiffNames,
      defendant_name: result.defendantName,
      case_number: result.caseNumber,
      circuit_number: result.circuitNumber,
      county: result.county,
      corporate_rep_name: result.corporateRepName,
      corporate_rep_deposition_date: result.corporateRepDepositionDate,
      targets: result.targets,
      target_count: result.targets.length,
    })
  } catch {
    // Table may not exist yet — continue anyway
  }

  return NextResponse.json(result)
}
