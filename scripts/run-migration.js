const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://zwjubigulpfdhtrrdina.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3anViaWd1bHBmZGh0cnJkaW5hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkxNjE3NCwiZXhwIjoyMDg4NDkyMTc0fQ.IyxL3ZHwvm6gmtAZQZpE_rDocYKcXQvoIlw40OGnD18',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function runMigration() {
  console.log('Running Arvantis database migration...\n')

  // The Supabase JS client can't run raw SQL directly.
  // We need to use the SQL Editor in the Supabase Dashboard.
  // However, we CAN use the Supabase Management API if we have an access token.
  //
  // Alternative approach: create tables one by one using the JS client's
  // ability to interact with existing RPC functions, OR use psql directly.
  //
  // Let's try using the Supabase project's direct Postgres connection.

  const projectRef = 'zwjubigulpfdhtrrdina'

  // Try the undocumented /sql endpoint used by the dashboard
  const sqlStatements = [
    // profiles table
    `CREATE TABLE IF NOT EXISTS profiles (
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
    )`,

    `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY`,

    // organizations
    `CREATE TABLE IF NOT EXISTS organizations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id),
      company_name TEXT,
      niche TEXT,
      phone TEXT,
      onboarding_status TEXT DEFAULT 'pending_call' CHECK (onboarding_status IN ('pending_call','call_booked','building','active')),
      onboarding_started_at TIMESTAMPTZ DEFAULT now(),
      stage_changed_at TIMESTAMPTZ DEFAULT now(),
      n8n_webhook_url TEXT,
      has_mini_bot BOOLEAN DEFAULT false,
      mini_bot_tier TEXT CHECK (mini_bot_tier IN ('cloud','hardware')),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,

    `ALTER TABLE organizations ENABLE ROW LEVEL SECURITY`,

    // agent_templates
    `CREATE TABLE IF NOT EXISTS agent_templates (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      category TEXT,
      default_prompt TEXT,
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,

    `ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY`,

    // organization_agents
    `CREATE TABLE IF NOT EXISTS organization_agents (
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
    )`,

    `ALTER TABLE organization_agents ENABLE ROW LEVEL SECURITY`,

    // admin_notes
    `CREATE TABLE IF NOT EXISTS admin_notes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      admin_user_id UUID REFERENCES auth.users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,

    `ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY`,

    // billing_events
    `CREATE TABLE IF NOT EXISTS billing_events (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      stripe_event_id TEXT,
      event_type TEXT,
      data JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now()
    )`,

    `ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY`,

    // cancellation_reasons
    `CREATE TABLE IF NOT EXISTS cancellation_reasons (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id),
      reason TEXT,
      plan TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,

    `ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY`,
  ]

  // Try executing via the Supabase SQL API (used by the dashboard internally)
  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i]
    const tableName = sql.match(/(?:TABLE|table)\s+(?:IF NOT EXISTS\s+)?(\w+)/)?.[1] || `statement ${i + 1}`

    try {
      const res = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabase.supabaseKey,
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        },
        body: JSON.stringify({ name: sql })
      })

      if (res.status === 404) {
        // RPC endpoint doesn't work for raw SQL
        // We need to fall back to a different method
        if (i === 0) {
          console.log('Cannot execute raw SQL via Supabase JS client or REST API.')
          console.log('The SQL must be run via the Supabase Dashboard SQL Editor.')
          console.log('')
          console.log('Please go to:')
          console.log(`  https://supabase.com/dashboard/project/${projectRef}/sql/new`)
          console.log('')
          console.log('And paste the contents of:')
          console.log('  supabase/migrations/001_admin_schema.sql')
          console.log('')

          // Let's try one more thing - psql via the pooler
          console.log('Attempting direct Postgres connection...')
          break
        }
      }
    } catch (err) {
      console.error(`Error on ${tableName}:`, err.message)
    }
  }

  // Try using psql if available
  const { execSync } = require('child_process')
  try {
    execSync('which psql', { stdio: 'pipe' })
    console.log('psql is available! Connecting to Supabase Postgres...')

    // Supabase direct connection format (transaction mode)
    // postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
    // But we need the DB password set during project creation
    console.log('')
    console.log('To connect via psql, you need your Supabase database password.')
    console.log('Find it at: https://supabase.com/dashboard/project/' + projectRef + '/settings/database')
    console.log('')
    console.log('Then run:')
    console.log(`  psql "postgresql://postgres.${projectRef}:[YOUR-DB-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/001_admin_schema.sql`)
  } catch {
    console.log('psql not available either.')
  }

  console.log('')
  console.log('=== EASIEST METHOD ===')
  console.log('')
  console.log('1. Open: https://supabase.com/dashboard/project/' + projectRef + '/sql/new')
  console.log('2. Copy-paste the SQL from supabase/migrations/001_admin_schema.sql')
  console.log('3. Click "Run"')
  console.log('')
  console.log('Then set yourself as admin:')
  console.log("   UPDATE profiles SET is_admin = true WHERE id = '<your-user-id>';")
}

runMigration().catch(console.error)
