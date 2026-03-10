import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

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

  // Send to n8n webhook
  const n8nUrl = process.env.N8N_WEBHOOK_URL
  if (!n8nUrl) {
    return NextResponse.json({ error: 'N8N_WEBHOOK_URL not configured' }, { status: 500 })
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

  const result = await n8nRes.json()

  // Fallback: extract case metadata from raw text if n8n didn't find it
  if (result.caseMetadata) {
    if (!result.caseMetadata.caseNumber) {
      result.caseMetadata.caseNumber = extractCaseNumber(text)
    }
    if (!result.caseMetadata.plaintiffName) {
      result.caseMetadata.plaintiffName = extractPartyName(text, 'plaintiff')
    }
    if (!result.caseMetadata.defendantName) {
      result.caseMetadata.defendantName = extractPartyName(text, 'defendant')
    }
    if (!result.caseMetadata.court) {
      result.caseMetadata.court = extractCourt(text)
    }
  }

  // Track runs and save to history (non-blocking)
  try {
    const admin = getSupabaseAdmin()

    // Increment runs_count for this user's document agent
    const { data: org } = await admin
      .from('organizations')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (org) {
      const { data: agent } = await admin
        .from('organization_agents')
        .select('id, runs_count')
        .eq('organization_id', org.id)
        .limit(1)
        .maybeSingle()

      if (agent) {
        await admin
          .from('organization_agents')
          .update({
            runs_count: (agent.runs_count || 0) + 1,
            last_run_at: new Date().toISOString(),
          })
          .eq('id', agent.id)
      }
    }

    // Save to processed_documents history
    await admin.from('processed_documents').insert({
      user_id: user.id,
      plaintiff_name: result.caseMetadata?.plaintiffName,
      defendant_name: result.caseMetadata?.defendantName,
      case_number: result.caseMetadata?.caseNumber,
      court: result.caseMetadata?.court,
      total_defenses: result.summary?.totalDefenses,
      matched: result.summary?.matched,
      flagged: result.summary?.flagged,
      results: result.results,
      reply_text: result.reply,
      status: result.summary?.flagged > 0 ? 'needs_review' : 'complete',
    })
  } catch {
    // Non-blocking — don't fail if tracking fails
  }

  return NextResponse.json(result)
}

// --- Fallback metadata extractors from raw PDF text ---

function extractCaseNumber(text: string): string | null {
  // Common Florida case number patterns
  const patterns = [
    // "Case No.: 2024-CA-123456" or "CASE NO. 24-CA-12345"
    /case\s*no\.?\s*:?\s*([0-9]{2,4}[-\s]*[A-Z]{1,4}[-\s]*[0-9]{3,8})/i,
    // "Case No: 24-012345-CI-01"
    /case\s*no\.?\s*:?\s*([0-9]{2,4}[-\s]*[0-9]{3,8}[-\s]*[A-Z]{1,4}(?:[-\s]*[0-9]{1,3})?)/i,
    // "Case #24CA12345"
    /case\s*#\s*([0-9]{2,4}\s*[A-Z]{1,4}\s*[0-9]{3,8})/i,
    // Standalone pattern: "24-CA-012345" on its own line
    /\b(\d{2,4}-[A-Z]{1,4}-\d{3,8}(?:-\d{1,3})?)\b/,
    // "CASE NUMBER" header followed by value
    /case\s*number\s*:?\s*([^\n,;]{5,30})/i,
    // Division patterns: "DIVISION: XX" near case number
    /(\d{2,4}[-\s]*(?:CA|CC|CL|CI|CF|DR|SC|CP|AP|CJ)[-\s]*\d{3,8})/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return null
}

function extractPartyName(text: string, role: 'plaintiff' | 'defendant'): string | null {
  // Look for "PLAINTIFF" or "DEFENDANT" labels near names
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase()
    if (role === 'plaintiff' && /\bPLAINTIFF/.test(line)) {
      // Name is usually on the line above
      if (i > 0 && lines[i - 1].length > 2 && !/case|court|circuit|county|division|no\./i.test(lines[i - 1])) {
        return lines[i - 1].replace(/[,.]$/, '').trim()
      }
    }
    if (role === 'defendant' && /\bDEFENDANT/.test(line)) {
      if (i > 0 && lines[i - 1].length > 2 && !/case|court|circuit|county|division|no\.|v\./i.test(lines[i - 1])) {
        return lines[i - 1].replace(/[,.]$/, '').trim()
      }
    }
  }

  // Fallback: look for "v." pattern — "NAME v. NAME"
  const vsMatch = text.match(/([A-Z][A-Z\s.,&'"-]+?)\s+v\.\s+([A-Z][A-Z\s.,&'"-]+?)(?:\n|,|\s{2})/i)
  if (vsMatch) {
    if (role === 'plaintiff') return vsMatch[1].replace(/[,.]$/, '').trim()
    if (role === 'defendant') return vsMatch[2].replace(/[,.]$/, '').trim()
  }

  return null
}

function extractCourt(text: string): string | null {
  // Look for "IN THE CIRCUIT COURT..." or "IN THE COUNTY COURT..."
  const courtMatch = text.match(/(IN THE (?:CIRCUIT|COUNTY|DISTRICT)\s+COURT[^.]*?(?:COUNTY|DISTRICT),?\s*(?:FLORIDA|FL))/i)
  if (courtMatch) {
    return courtMatch[1].trim()
  }

  // Look for court name spanning multiple lines
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  for (let i = 0; i < lines.length; i++) {
    if (/^IN THE (CIRCUIT|COUNTY|DISTRICT) COURT/i.test(lines[i])) {
      let court = lines[i]
      // Grab next few lines if they're part of the court name
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        if (/FLORIDA|FL\b/i.test(lines[j])) {
          court += ' ' + lines[j]
          break
        }
        if (/county|circuit|judicial|division/i.test(lines[j])) {
          court += ' ' + lines[j]
        } else {
          break
        }
      }
      return court.trim()
    }
  }

  return null
}
