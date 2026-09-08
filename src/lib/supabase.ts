import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/*
  The Supabase client, and the one place the environment is read.

  The backend lives in `supabase/` on the integration branch: Postgres with row
  level security, and auth in auth.users mirrored into a public `users` table.
  RLS is what actually enforces who may see what — everything the UI hides is a
  courtesy on top of it (§12).
*/

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * True when the app has somewhere to talk to. Without it every query would
 * throw on construction, so the screens check this and say the backend is not
 * configured rather than showing an empty board as though the club had no work.
 */
export const isConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'anon',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/**
 * The message a screen shows when there is no backend to read from.
 *
 * Kept as one string so the whole app says the same thing, and so it is obvious
 * in a diff if anyone starts inventing a friendlier lie about it.
 */
export const NOT_CONFIGURED =
  'No backend configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.';

/**
 * Narrows a PostgREST error into something a screen can show.
 *
 * A failed read is not an empty read: an empty state says "there is nothing
 * here", which is a claim about the club, and it must never stand in for "we
 * could not ask".
 */
export function describeError(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;

  const message = (error as { message?: string }).message;
  const code = (error as { code?: string }).code;

  if (code === 'PGRST301' || code === '42501') {
    return 'You do not have access to this.';
  }

  return message || 'Something went wrong reading that.';
}
