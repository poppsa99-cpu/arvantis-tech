import { requireAdmin } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

interface DiagnosticReport {
  id: string
  workflow: string
  timestamp: string
  category: string
  severity: 'critical' | 'warning' | 'info'
  summary: string
  details: {
    errorMessage: string
    fileName: string | null
    rawTextPreview: string | null
    webhookHealthy: boolean
    envConfigured: boolean
  }
  suggestedFix: string
  autoFixAvailable: boolean
}

const WORKFLOW_WEBHOOK_ENV_MAP: Record<string, string> = {
  'motion-to-compel': 'N8N_MOTION_COMPEL_WEBHOOK_URL',
  'compel-documents': 'N8N_COMPEL_DOCS_WEBHOOK_URL',
}

function categorizeError(errorMessage: string): {
  category: string
  severity: 'critical' | 'warning' | 'info'
  suggestedFix: string
  autoFixAvailable: boolean
} {
  const msg = errorMessage.toLowerCase()

  if (msg.includes('credit balance') || msg.includes('billing')) {
    return {
      category: 'API_CREDITS',
      severity: 'critical',
      suggestedFix: 'Add credits at console.anthropic.com',
      autoFixAvailable: true,
    }
  }

  if (msg.includes('timeout') || msg.includes('etimedout')) {
    return {
      category: 'TIMEOUT',
      severity: 'warning',
      suggestedFix: 'n8n workflow may be overloaded or down',
      autoFixAvailable: true,
    }
  }

  if (msg.includes('no text provided')) {
    return {
      category: 'EMPTY_INPUT',
      severity: 'warning',
      suggestedFix: 'File extraction returned no text',
      autoFixAvailable: false,
    }
  }

  if (msg.includes('no deposition targets') || msg.includes('no document requests')) {
    return {
      category: 'PARSE_FAILURE',
      severity: 'warning',
      suggestedFix: "AI couldn't parse the document format",
      autoFixAvailable: false,
    }
  }

  if (msg.includes('not configured')) {
    return {
      category: 'MISSING_ENV',
      severity: 'critical',
      suggestedFix: 'Webhook URL env var not set in Vercel',
      autoFixAvailable: false,
    }
  }

  if (msg.includes('unauthorized') || msg.includes('401')) {
    return {
      category: 'AUTH_ERROR',
      severity: 'critical',
      suggestedFix: 'API key expired or invalid',
      autoFixAvailable: false,
    }
  }

  return {
    category: 'UNKNOWN',
    severity: 'info',
    suggestedFix: 'Manual investigation needed',
    autoFixAvailable: false,
  }
}

async function checkWebhookHealth(webhookUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(webhookUrl, {
      method: 'HEAD',
      signal: controller.signal,
    })
    clearTimeout(timeout)
    // n8n webhooks typically return 200 or 405 (method not allowed for HEAD) — both mean it's reachable
    return res.status < 500
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const { user, isAdmin } = await requireAdmin()
  if (!user || !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id, workflow } = await request.json()

  if (!id || !workflow) {
    return NextResponse.json({ error: 'Missing required fields: id, workflow' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // 1. Fetch the failed record
  const table = workflow === 'compel-documents'
    ? 'compel_documents_history'
    : 'motion_to_compel_documents'

  const { data: record, error: fetchError } = await admin
    .from(table)
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error(`Failed to fetch record from ${table}:`, fetchError)
  }

  const errorMessage = record?.error_message || 'No error message recorded'
  const fileName = record?.file_name || null
  const rawText = record?.raw_text || null

  // 2. Check webhook health
  const envKey = WORKFLOW_WEBHOOK_ENV_MAP[workflow] || ''
  const webhookUrl = envKey ? process.env[envKey] : undefined
  const envConfigured = !!webhookUrl

  let webhookHealthy = false
  if (webhookUrl) {
    webhookHealthy = await checkWebhookHealth(webhookUrl)
  }

  // 3. Categorize the error
  const { category, severity, suggestedFix, autoFixAvailable } = categorizeError(errorMessage)

  // 4. Build summary
  const summaryParts = [`${category} error on ${workflow}`]
  if (fileName) summaryParts.push(`file: ${fileName}`)
  if (!envConfigured) summaryParts.push('webhook env not configured')
  else if (!webhookHealthy) summaryParts.push('webhook unreachable')
  const summary = summaryParts.join(' — ')

  // 5. Build report
  const report: DiagnosticReport = {
    id,
    workflow,
    timestamp: new Date().toISOString(),
    category,
    severity,
    summary,
    details: {
      errorMessage,
      fileName,
      rawTextPreview: rawText ? rawText.slice(0, 300) : null,
      webhookHealthy,
      envConfigured,
    },
    suggestedFix,
    autoFixAvailable,
  }

  // 6. Save diagnostic report (don't fail if table doesn't exist)
  try {
    await admin.from('diagnostic_reports').insert({
      record_id: id,
      workflow,
      category,
      severity,
      summary,
      error_message: errorMessage,
      file_name: fileName,
      webhook_healthy: webhookHealthy,
      env_configured: envConfigured,
      suggested_fix: suggestedFix,
      auto_fix_available: autoFixAvailable,
      report_json: report,
    })
  } catch (err) {
    console.error('Failed to save diagnostic report (table may not exist):', err)
  }

  // 7. Return the report
  return NextResponse.json(report)
}
