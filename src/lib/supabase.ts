import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const service = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const supabaseEnabled = Boolean(url && anon);

let publicClient: SupabaseClient | null = null;
/** Lesender Client (anon key, respektiert Row Level Security). */
export function getPublicClient() {
  if (!supabaseEnabled) return null;
  publicClient ??= createClient(url!, anon!, { auth: { persistSession: false } });
  return publicClient;
}

/** Server-Client mit Service-Role-Key. Nur in API-Routen verwenden, nie im Browser. */
export function getServiceClient() {
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false } });
}
