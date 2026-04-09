import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export interface FirmSettings {
  firm_name: string
  firm_role: string
  address_line1: string
  address_line2: string
  phone: string
  fax: string
  emails: string[]
  attorney_name: string
  attorney_title: string
  bar_number: string
}

const DEFAULT_FIRM: FirmSettings = {
  firm_name: '[FIRM NAME]',
  firm_role: 'Attorneys for Plaintiff',
  address_line1: '[ADDRESS LINE 1]',
  address_line2: '[CITY, STATE ZIP]',
  phone: '[PHONE]',
  fax: '[FAX]',
  emails: ['[EMAIL]'],
  attorney_name: '[ATTORNEY NAME]',
  attorney_title: 'ESQ.',
  bar_number: '[BAR NUMBER]',
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!org) {
    return NextResponse.json({ firm: DEFAULT_FIRM })
  }

  // Get firm settings from any org agent that has them configured
  const { data: agents } = await admin
    .from('organization_agents')
    .select('config')
    .eq('organization_id', org.id)

  const agentWithFirm = (agents || []).find(
    (a) => a.config && typeof a.config === 'object' && 'firm' in (a.config as Record<string, unknown>)
  )

  const firm = agentWithFirm
    ? { ...DEFAULT_FIRM, ...((agentWithFirm.config as Record<string, unknown>).firm as Partial<FirmSettings>) }
    : DEFAULT_FIRM

  return NextResponse.json({ firm })
}
