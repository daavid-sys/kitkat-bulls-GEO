import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Throw only on use, not at import — allows the bundle to build in environments
  // where the keys are injected later. The error message is loud enough that any
  // accidental call without env will fail fast.
  console.warn('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — client will throw on use.');
}

export const supabase: SupabaseClient = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: true, autoRefreshToken: true },
});
