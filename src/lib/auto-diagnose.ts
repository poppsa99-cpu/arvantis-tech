import { getSupabaseAdmin } from '@/lib/supabase/admin'

interface DiagnosticReport {
  workflow: string
  timestamp: string
  category: string
  severity: 'critical' | 'warning' | 'info'
  summary: string
  details: {
    errorMessage: string
    fileName: string | null
    rawTextPreview: string | null
    webhookUrl: string | null
    docRecordId: string | null
  }
  suggestedFix: string
  autoFixAvailable: boolean
}

function categorize(error: string): { category: string; severity: 'critical' | 'warning' | 'info'; fix: string; autoFix: boolean } {
  const e = error.toLowerCase()
  if (e.includes('credit') || e.includes('billing') || e.includes('balance'))
    return { category: 'API_CREDITS', severity: 'critical', fix: 'Add credits at console.anthropic.com/settings/billing', autoFix: false }
  if (e.includes('timeout') || e.includes('etimedout') || e.includes('econnrefused'))
    return { category: 'TIMEOUT', severity: 'warning', fix: 'n8n workflow may be overloaded or down. Check n8n dashboard.', autoFix: true }
  if (e.includes('no text provided') || e.includes('no text could be extracted'))
    return { category: 'EMPTY_INPUT', severity: 'info', fix: 'File extraction returned no text. Client may have uploaded a scanned PDF without OCR support.', autoFix: false }
  if (e.includes('no deposition targets') || e.includes('no document requests'))
    return { category: 'PARSE_FAILURE', severity: 'warning', fix: 'AI could not parse deposition targets from the email. Document format may not match expected structure.', autoFix: true }
  if (e.includes('not configured'))
    return { category: 'MISSING_ENV', severity: 'critical', fix: 'Webhook URL env var not set in Vercel. Add it in Vercel Settings > Environment Variables.', autoFix: false }
  if (e.includes('unauthorized') || e.includes('401') || e.includes('invalid api key'))
    return { category: 'AUTH_ERROR', severity: 'critical', fix: 'API key expired or invalid. Update the credential in n8n.', autoFix: false }
  if (e.includes('rate limit') || e.includes('429'))
    return { category: 'RATE_LIMIT', severity: 'warning', fix: 'API rate limit hit. Wait a minute and retry.', autoFix: true }
  return { category: 'UNKNOWN', severity: 'warning', fix: 'Manual investigation needed. Check the error message and n8n execution logs.', autoFix: false }
}

/**
 * Auto-diagnose a workflow error. Call this after any error in a process route.
 * Non-blocking — never throws.
 */
export async function autoDiagnose(params: {
  workflow: string
  errorMessage: string
  fileName?: string | null
  rawText?: string | null
  docRecordId?: string | null
  webhookUrl?: string | null
}): Promise<void> {
  try {
    const { category, severity, fix, autoFix } = categorize(params.errorMessage)

    const report: DiagnosticReport = {
      workflow: params.workflow,
      timestamp: new Date().toISOString(),
      category,
      severity,
      summary: `[${category}] ${params.workflow}: ${params.errorMessage.slice(0, 200)}`,
      details: {
        errorMessage: params.errorMessage.slice(0, 2000),
        fileName: params.fileName || null,
        rawTextPreview: params.rawText?.slice(0, 300) || null,
        webhookUrl: params.webhookUrl ? '[configured]' : '[missing]',
        docRecordId: params.docRecordId || null,
      },
      suggestedFix: fix,
      autoFixAvailable: autoFix,
    }

    const admin = getSupabaseAdmin()
    await admin.from('diagnostic_reports').insert({
      workflow: report.workflow,
      category: report.category,
      severity: report.severity,
      summary: report.summary,
      error_message: report.details.errorMessage,
      file_name: report.details.fileName,
      raw_text_preview: report.details.rawTextPreview,
      suggested_fix: report.suggestedFix,
      auto_fix_available: report.autoFixAvailable,
      doc_record_id: report.details.docRecordId,
      report_data: report,
    })
  } catch {
    // Never fail the main request
  }
}
