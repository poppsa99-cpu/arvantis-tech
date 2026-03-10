import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase admin client using service role key.
 * Lazy-initialized to avoid build-time errors when env vars are missing.
 * NEVER expose this on the client.
 */
let _admin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return _admin
}
