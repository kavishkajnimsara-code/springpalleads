import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

/**
 * Returns a server-only Supabase client authenticated with the Service Role key.
 * NEVER import this file in client components or expose SUPABASE_SERVICE_ROLE_KEY
 * via NEXT_PUBLIC_ environment variables.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase server configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment."
    );
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return cachedClient;
}
