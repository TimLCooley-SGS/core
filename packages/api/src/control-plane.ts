import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "./config";

let _client: SupabaseClient | null = null;

/**
 * Returns the control plane Supabase client (service role).
 * This client has full access to the control plane database.
 */
export function getControlPlaneClient(): SupabaseClient {
  if (!_client) {
    const config = getConfig();
    _client = createClient(
      config.CONTROL_PLANE_SUPABASE_URL,
      config.CONTROL_PLANE_SUPABASE_SERVICE_KEY,
    );
  }
  return _client;
}

/**
 * Returns a control plane client scoped to a specific user's JWT.
 * Used for RLS-protected queries on behalf of a logged-in user.
 */
export function getControlPlaneClientForUser(
  accessToken: string,
): SupabaseClient {
  const config = getConfig();
  return createClient(
    config.CONTROL_PLANE_SUPABASE_URL,
    config.CONTROL_PLANE_SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    },
  );
}
