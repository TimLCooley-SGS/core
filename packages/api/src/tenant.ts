import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Organization } from "@sgscore/types";

// Cache tenant clients by org ID to avoid creating new connections per request
const tenantClients = new Map<string, SupabaseClient>();

/**
 * Returns a tenant Supabase client (service role) for the given org.
 * Used for server-side operations within a tenant database.
 */
export function getTenantClient(
  org: Pick<Organization, "id" | "supabase_url" | "supabase_service_key">,
): SupabaseClient {
  if (!org.supabase_url || !org.supabase_service_key) {
    throw new Error(
      `Organization ${org.id} is not fully provisioned (missing Supabase credentials)`,
    );
  }

  const cached = tenantClients.get(org.id);
  if (cached) return cached;

  const client = createClient(org.supabase_url, org.supabase_service_key);
  tenantClients.set(org.id, client);
  return client;
}

/**
 * Returns a tenant client scoped to a patron/staff user's session.
 * Uses the org's anon key + the user's access token for RLS.
 */
export function getTenantClientForUser(
  org: Pick<Organization, "id" | "supabase_url" | "supabase_anon_key">,
  accessToken: string,
): SupabaseClient {
  if (!org.supabase_url || !org.supabase_anon_key) {
    throw new Error(
      `Organization ${org.id} is not fully provisioned (missing Supabase credentials)`,
    );
  }

  return createClient(org.supabase_url, org.supabase_anon_key, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

/**
 * Removes a cached tenant client (e.g., when an org is suspended or archived).
 */
export function removeTenantClient(orgId: string): void {
  tenantClients.delete(orgId);
}
