import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** true when the Supabase keys are present (see .env.example). */
export const SUPABASE_CONFIGURED = Boolean(url && anonKey);

export const supabase = createClient(
  url || 'https://missing-project.supabase.co',
  anonKey || 'missing-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

/** Google sign-in button is shown only once the provider is configured in Supabase. */
export const GOOGLE_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE === 'true';
