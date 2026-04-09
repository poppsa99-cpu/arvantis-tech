import { requireAdmin } from '@/lib/admin/auth'
import { NextResponse } from 'next/server'

interface WorkflowHealth {
  workflow: string
  configured: boolean
  reachable: boolean | null
  responseTimeMs: number | null
  error: string | null
}

const WORKFLOWS = [
  { name: 'motion-to-compel', envVar: 'N8N_MOTION_COMPEL_WEBHOOK_URL' },
  { name: 'compel-documents', envVar: 'N8N_COMPEL_DOCS_WEBHOOK_URL' },
  { name: 'motion-to-strike', envVar: 'N8N_WEBHOOK_URL' },
] as const

/**
 * GET /api/admin/workflow-health
 * Health check for each n8n workflow webhook.
 * Checks whether env vars are configured and whether the URLs are reachable.
 */
export async function GET() {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const results: WorkflowHealth[] = await Promise.all(
    WORKFLOWS.map(async ({ name, envVar }) => {
      const url = process.env[envVar]

      if (!url) {
        return {
          workflow: name,
          configured: false,
          reachable: null,
          responseTimeMs: null,
          error: `${envVar} not set`,
        }
      }

      // Ping the webhook with a HEAD request (or GET) to check reachability
      // Use a short timeout to avoid blocking
      const start = Date.now()
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        })
        clearTimeout(timeout)

        const responseTimeMs = Date.now() - start

        // n8n webhooks may return various status codes for GET (405, 200, etc.)
        // A response (even 405 Method Not Allowed) means the server is reachable
        const reachable = res.status < 500

        return {
          workflow: name,
          configured: true,
          reachable,
          responseTimeMs,
          error: reachable ? null : `HTTP ${res.status}`,
        }
      } catch (err) {
        return {
          workflow: name,
          configured: true,
          reachable: false,
          responseTimeMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        }
      }
    })
  )

  const allHealthy = results.every(r => r.configured && r.reachable)

  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    workflows: results,
    checkedAt: new Date().toISOString(),
  })
}
