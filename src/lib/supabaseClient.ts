import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/db';

/**
 * Shared Supabase Client for InovX Ops.
 * 
 * Default fallback values point to the approved InovX Ops staging project:
 * Project ref: ljtreitmsvzseqspiocq
 * URL: https://ljtreitmsvzseqspiocq.supabase.co
 */
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://ljtreitmsvzseqspiocq.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_4n4BGSnpQV_70Nc7IEWK9Q_VlJ5vXqP';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  if (import.meta.env.DEV) {
    console.info(
      '[SupabaseClient] Using default staging credentials. To customize, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
    );
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
