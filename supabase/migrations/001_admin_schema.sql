-- Arvantis Admin Dashboard Schema
-- Run this in Supabase SQL Editor

-- Add admin flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  company_name TEXT,
  niche TEXT,
  phone TEXT,
  onboarding_status TEXT DEFAULT 'pending_call'
    CHECK (onboarding_status IN ('pending_call','call_booked','building','active')),
  onboarding_started_at TIMESTAMPTZ DEFAULT now(),
  stage_changed_at TIMESTAMPTZ DEFAULT now(),
  n8n_webhook_url TEXT,
  has_mini_bot BOOLEAN DEFAULT false,
  mini_bot_tier TEXT CHECK (mini_bot_tier IN ('cloud','hardware')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent templates (master list)
CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  default_prompt TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deployed agents per client
CREATE TABLE IF NOT EXISTS organization_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_template_id UUID REFERENCES agent_templates(id),
  n8n_webhook_url TEXT,
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','error')),
  last_run_at TIMESTAMPTZ,
  runs_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin notes per client
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- Policies: service role gets full access, anon gets nothing
-- (All admin queries go through the service role client)
CREATE POLICY "service_role_organizations" ON organizations FOR ALL
  USING (true) WITH CHECK (true);
CREATE POLICY "service_role_agent_templates" ON agent_templates FOR ALL
  USING (true) WITH CHECK (true);
CREATE POLICY "service_role_organization_agents" ON organization_agents FOR ALL
  USING (true) WITH CHECK (true);
CREATE POLICY "service_role_admin_notes" ON admin_notes FOR ALL
  USING (true) WITH CHECK (true);

-- Seed agent templates
INSERT INTO agent_templates (slug, display_name, description, icon, category) VALUES
  ('setter', 'Setter Agent', 'Cold outreach via email/DM, qualifies leads, books calls', 'Mail', 'sales'),
  ('closer', 'Closer Agent', 'Follow-up sequences, sends proposals, handles objections', 'Target', 'sales'),
  ('support', 'Customer Support Agent', 'Answers questions via email/chat, escalates complex issues', 'Headphones', 'operations'),
  ('social-media', 'Social Media Agent', 'Generates and schedules posts, captions, hashtags', 'Share2', 'marketing'),
  ('lead-gen', 'Lead Gen Agent', 'Finds leads matching ICP, enriches contact data', 'Search', 'sales'),
  ('billing', 'Billing Agent', 'Generates invoices, sends payment reminders, tracks AR', 'Receipt', 'operations'),
  ('document', 'Document Automation Agent', 'Parses docs, classifies content, generates responses', 'FileText', 'operations'),
  ('fulfillment', 'Fulfillment Agent', 'Tracks delivery, sends status updates, manages timelines', 'Package', 'operations')
ON CONFLICT (slug) DO NOTHING;
