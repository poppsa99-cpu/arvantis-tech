import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()

  // Get all templates
  const { data: templates } = await admin
    .from('agent_templates')
    .select('*')
    .order('category', { ascending: true })

  // Get deployments with organization details
  const { data: deployments } = await admin
    .from('organization_agents')
    .select('id, agent_template_id, status, organization:organizations(id, company_name, user_id)')

  const deploymentsByTemplate: Record<string, Array<{
    id: string
    status: string
    company_name: string
    organization_id: string
    user_id: string
  }>> = {}

  for (const d of (deployments || []) as Array<Record<string, unknown>>) {
    const templateId = d.agent_template_id as string
    const org = (Array.isArray(d.organization) ? d.organization[0] : d.organization) as Record<string, unknown> | null
    if (!deploymentsByTemplate[templateId]) deploymentsByTemplate[templateId] = []
    deploymentsByTemplate[templateId].push({
      id: d.id as string,
      status: d.status as string,
      company_name: (org?.company_name as string) || 'Unknown',
      organization_id: (org?.id as string) || '',
      user_id: (org?.user_id as string) || '',
    })
  }

  const templatesWithCounts = (templates || []).map((t) => ({
    ...t,
    deployment_count: deploymentsByTemplate[t.id]?.length || 0,
    deployments: deploymentsByTemplate[t.id] || [],
  }))

  return NextResponse.json({ templates: templatesWithCounts })
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('agent_templates')
    .insert({
      slug: body.slug,
      display_name: body.display_name,
      description: body.description || null,
      icon: body.icon || null,
      category: body.category || null,
      default_prompt: body.default_prompt || null,
      is_available: body.is_available ?? true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ template: data })
}

export async function PATCH(request: NextRequest) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const admin = getSupabaseAdmin()

  // Toggle a deployed agent's status
  if (body.type === 'deployment') {
    const { deployment_id, status } = body
    const { error } = await admin
      .from('organization_agents')
      .update({ status })
      .eq('id', deployment_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  // Update agent template — whitelist allowed fields
  const { id } = body
  const updates: Record<string, unknown> = {}
  if (body.is_available !== undefined) updates.is_available = body.is_available
  if (body.display_name !== undefined) updates.display_name = body.display_name
  if (body.description !== undefined) updates.description = body.description
  if (body.icon !== undefined) updates.icon = body.icon
  if (body.category !== undefined) updates.category = body.category
  if (body.default_prompt !== undefined) updates.default_prompt = body.default_prompt

  const { error } = await admin
    .from('agent_templates')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
