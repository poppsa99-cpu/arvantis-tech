-- ========================================
-- ARVANTIS TECH — FULL DATABASE SCHEMA
-- Run this in Supabase SQL Editor (new tab)
-- ========================================

-- 1. PROFILES (core user data + billing)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  is_admin BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_plan TEXT,
  subscription_status TEXT,
  setup_fee_paid BOOLEAN DEFAULT false,
  current_period_end TIMESTAMPTZ,
  payment_failures INTEGER DEFAULT 0,
  dunning_stage TEXT,
  last_payment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role full access profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. BILLING EVENTS (Stripe webhook log)
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT,
  event_type TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_billing_events" ON billing_events FOR ALL USING (true) WITH CHECK (true);

-- 3. CANCELLATION REASONS
CREATE TABLE IF NOT EXISTS cancellation_reasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  reason TEXT,
  plan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_cancellation_reasons" ON cancellation_reasons FOR ALL USING (true) WITH CHECK (true);

-- 4. ORGANIZATIONS (one per client)
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

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);

-- 5. AGENT TEMPLATES (master list of available agents)
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

ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_agent_templates" ON agent_templates FOR ALL USING (true) WITH CHECK (true);

-- 6. ORGANIZATION AGENTS (deployed per client)
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

ALTER TABLE organization_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_organization_agents" ON organization_agents FOR ALL USING (true) WITH CHECK (true);

-- 7. ADMIN NOTES (internal notes per client)
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_admin_notes" ON admin_notes FOR ALL USING (true) WITH CHECK (true);

-- 8. SEED AGENT TEMPLATES
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

-- 9. CREATE PROFILES FOR EXISTING USERS
INSERT INTO profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
