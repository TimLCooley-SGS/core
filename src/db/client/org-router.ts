import { getControlPlaneClient } from './control-plane.js';
import { getTenantClient, getTenantClientForUser } from './tenant.js';
import type { Organization, IdentityOrgLink } from '../../types/control-plane.js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolves an organization by slug.
 */
export async function getOrgBySlug(slug: string): Promise<Organization | null> {
  const cp = getControlPlaneClient();
  const { data, error } = await cp
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error || !data) return null;
  return data as Organization;
}

/**
 * Resolves an organization by ID.
 */
export async function getOrgById(id: string): Promise<Organization | null> {
  const cp = getControlPlaneClient();
  const { data, error } = await cp
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Organization;
}

/**
 * Returns all active org links for a global identity.
 * Used after login to determine which orgs the user can access.
 */
export async function getLinksForIdentity(globalIdentityId: string): Promise<(IdentityOrgLink & { organization: Organization })[]> {
  const cp = getControlPlaneClient();
  const { data, error } = await cp
    .from('identity_org_links')
    .select('*, organization:organizations(*)')
    .eq('global_identity_id', globalIdentityId)
    .eq('status', 'active');

  if (error) throw new Error(`Failed to fetch org links: ${error.message}`);
  return (data ?? []) as (IdentityOrgLink & { organization: Organization })[];
}

/**
 * Returns a tenant service client for the given org slug.
 * Convenience method for server-side operations.
 */
export async function getTenantClientBySlug(slug: string): Promise<{ client: SupabaseClient; org: Organization } | null> {
  const org = await getOrgBySlug(slug);
  if (!org) return null;
  return { client: getTenantClient(org), org };
}

/**
 * Returns a tenant client for a user within a specific org.
 * Resolves the org, verifies the user has access, and returns the scoped client.
 */
export async function getTenantClientForIdentity(
  globalIdentityId: string,
  organizationId: string,
  accessToken: string,
): Promise<{ client: SupabaseClient; org: Organization; link: IdentityOrgLink } | null> {
  const cp = getControlPlaneClient();

  // Fetch org and link in parallel
  const [orgResult, linkResult] = await Promise.all([
    cp.from('organizations').select('*').eq('id', organizationId).eq('status', 'active').single(),
    cp.from('identity_org_links').select('*')
      .eq('global_identity_id', globalIdentityId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single(),
  ]);

  if (orgResult.error || !orgResult.data) return null;
  if (linkResult.error || !linkResult.data) return null;

  const org = orgResult.data as Organization;
  const link = linkResult.data as IdentityOrgLink;

  return {
    client: getTenantClientForUser(org, accessToken),
    org,
    link,
  };
}
