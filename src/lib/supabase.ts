import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Supabase is the production backend (Postgres + Auth + Storage).
// Until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set in .env.local the app
// falls back to a local persistent mock store (see lib/store.tsx) so the whole
// frontend is runnable and demoable without provisioning a project first.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseEnabled = Boolean(url && anon)

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url!, anon!)
  : null
