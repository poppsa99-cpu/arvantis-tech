import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Use a direct connection to run DDL
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Create analytics_events table if it doesn't exist
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS analytics_events (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id),
        event_type text NOT NULL,
        workflow text,
        metadata jsonb DEFAULT '{}',
        error_message text,
        duration_ms integer,
        created_at timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
    `
  })

  if (error) {
    // If rpc doesn't exist, try direct insert to test if table exists
    const { error: testError } = await supabase
      .from('analytics_events')
      .select('id')
      .limit(1)

    if (testError) {
      return NextResponse.json({
        error: 'Table does not exist. Please create it manually in Supabase SQL editor.',
        sql: `CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  workflow text,
  metadata jsonb DEFAULT '{}',
  error_message text,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);`,
      }, { status: 200 })
    }

    return NextResponse.json({ message: 'Table already exists' })
  }

  return NextResponse.json({ message: 'Migration complete' })
}
