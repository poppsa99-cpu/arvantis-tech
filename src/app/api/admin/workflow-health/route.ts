import { requireAdmin } from '@/lib/admin/auth'
import { NextResponse } from 'next/server'

const WORKFLOWS = [
  { slug: 'motion-to-strike', name: 'Motion to Strike', envVar: 'N8N_WEBHOOK_URL' },
  { slug: 'motion-to-compel', name: 'Motion to Compel', envVar: 'N8N_MOTION_COMPEL_WEBHOOK_URL' },
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

  const results = await Promise.all(
    WORKFLOWS.map(async ({ slug, name, envVar }) => {
      const url = process.env[envVar]

      if (!url) {
        return {
          slug,
          name,
          healthy: false,
          configured: false,
          reachable: false,
          responseTimeMs: null,
          error: `${envVar} not set`,
        }
      }

      // Ping the webhook with a GET request to check reachability
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
          slug,
          name,
          healthy: reachable,
          configured: true,
          reachable,
          responseTimeMs,
          error: reachable ? null : `HTTP ${res.status}`,
        }
      } catch (err) {
        return {
          slug,
          name,
          healthy: false,
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
