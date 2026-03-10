export interface Organization {
  id: string
  user_id: string
  company_name: string | null
  niche: string | null
  phone: string | null
  onboarding_status: 'pending_call' | 'call_booked' | 'building' | 'active'
  onboarding_started_at: string
  stage_changed_at: string
  n8n_webhook_url: string | null
  has_mini_bot: boolean
  mini_bot_tier: 'cloud' | 'hardware' | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AgentTemplate {
  id: string
  slug: string
  display_name: string
  description: string | null
  icon: string | null
  category: string | null
  default_prompt: string | null
  is_available: boolean
  created_at: string
}

export interface OrganizationAgent {
  id: string
  organization_id: string
  agent_template_id: string
  n8n_webhook_url: string | null
  config: Record<string, unknown>
  status: 'active' | 'paused' | 'error'
  last_run_at: string | null
  runs_count: number
  error_message: string | null
  created_at: string
  agent_template?: AgentTemplate
}

export interface AdminNote {
  id: string
  organization_id: string
  admin_user_id: string
  content: string
  created_at: string
}

export interface Profile {
  id: string
  is_admin: boolean
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_plan: 'starter' | 'growth' | 'scale' | null
  subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'paused' | null
  setup_fee_paid: boolean
  current_period_end: string | null
  payment_failures: number
  dunning_stage: 'notice' | 'warning' | 'critical' | null
  last_payment_at: string | null
  created_at: string
  updated_at: string
}

export interface ClientListItem {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  niche: string | null
  phone: string | null
  subscription_plan: string | null
  subscription_status: string | null
  setup_fee_paid: boolean
  onboarding_status: string | null
  agent_count: number
  mrr: number
  created_at: string
  organization_id: string | null
}

export interface DashboardStats {
  totalMrr: number
  activeClients: number
  onboardingCounts: Record<string, number>
  agentErrors: number
  recentActivity: BillingEvent[]
  mrrTrend: { month: string; mrr: number }[]
}

export interface BillingEvent {
  id: string
  stripe_event_id: string
  event_type: string
  data: Record<string, unknown>
  created_at: string
}

export interface RevenueBreakdown {
  byTier: { tier: string; count: number; mrr: number }[]
  mrrTrend: { month: string; mrr: number }[]
  setupFeesThisMonth: number
  setupFeesTotal: number
  churnRate: number
  paymentFailures: ClientListItem[]
  upcomingRenewals: ClientListItem[]
}

export const PLAN_MRR: Record<string, number> = {
  starter: 700,
  growth: 1000,
  scale: 1500,
}

export const PLAN_AGENT_LIMITS: Record<string, number> = {
  starter: 3,
  growth: 5,
  scale: 999,
}
