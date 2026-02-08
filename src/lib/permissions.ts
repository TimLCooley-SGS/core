import type { SupabaseClient } from '@supabase/supabase-js';
import type { Capability, StaffCapabilityOverride } from '../types/tenant.js';

/**
 * Resolves the effective capabilities for a person based on their active
 * staff assignments and any per-user overrides.
 *
 * Formula:
 *   effective = (role_capabilities for assigned role)
 *             + (overrides where type = grant)
 *             - (overrides where type = revoke)
 */
export async function resolveCapabilities(
  tenantClient: SupabaseClient,
  personId: string,
): Promise<Capability[]> {
  // Get all active staff assignments for this person
  const { data: assignments, error: assignError } = await tenantClient
    .from('staff_assignments')
    .select('id, role_id')
    .eq('person_id', personId)
    .eq('status', 'active');

  if (assignError) throw new Error(`Failed to fetch staff assignments: ${assignError.message}`);
  if (!assignments || assignments.length === 0) return [];

  const assignmentIds = assignments.map(a => a.id);
  const roleIds = assignments.map(a => a.role_id);

  // Fetch role capabilities and overrides in parallel
  const [roleCapResult, overridesResult] = await Promise.all([
    tenantClient
      .from('role_capabilities')
      .select('capability_id, capability:capabilities(*)')
      .in('role_id', roleIds),
    tenantClient
      .from('staff_capability_overrides')
      .select('capability_id, override_type')
      .in('staff_assignment_id', assignmentIds),
  ]);

  if (roleCapResult.error) throw new Error(`Failed to fetch role capabilities: ${roleCapResult.error.message}`);
  if (overridesResult.error) throw new Error(`Failed to fetch overrides: ${overridesResult.error.message}`);

  // Build capability map from role assignments
  const capabilityMap = new Map<string, Capability>();
  for (const rc of roleCapResult.data ?? []) {
    const cap = rc.capability as unknown as Capability;
    if (cap) capabilityMap.set(cap.id, cap);
  }

  // Apply overrides
  const overrides = (overridesResult.data ?? []) as Pick<StaffCapabilityOverride, 'capability_id' | 'override_type'>[];
  const grantedIds = new Set<string>();
  const revokedIds = new Set<string>();

  for (const override of overrides) {
    if (override.override_type === 'grant') {
      grantedIds.add(override.capability_id);
    } else {
      revokedIds.add(override.capability_id);
    }
  }

  // Remove revoked capabilities
  for (const id of revokedIds) {
    capabilityMap.delete(id);
  }

  // Add granted capabilities (need to fetch full capability objects for grants)
  if (grantedIds.size > 0) {
    const missingIds = [...grantedIds].filter(id => !capabilityMap.has(id));
    if (missingIds.length > 0) {
      const { data: grantedCaps } = await tenantClient
        .from('capabilities')
        .select('*')
        .in('id', missingIds);

      for (const cap of grantedCaps ?? []) {
        capabilityMap.set(cap.id, cap as Capability);
      }
    }
  }

  return Array.from(capabilityMap.values());
}

/**
 * Checks whether a person has a specific capability (by key).
 */
export async function hasCapability(
  tenantClient: SupabaseClient,
  personId: string,
  capabilityKey: string,
): Promise<boolean> {
  const capabilities = await resolveCapabilities(tenantClient, personId);
  return capabilities.some(c => c.key === capabilityKey);
}

/**
 * Checks whether a person has any of the specified capabilities.
 */
export async function hasAnyCapability(
  tenantClient: SupabaseClient,
  personId: string,
  capabilityKeys: string[],
): Promise<boolean> {
  const capabilities = await resolveCapabilities(tenantClient, personId);
  const keySet = new Set(capabilityKeys);
  return capabilities.some(c => keySet.has(c.key));
}

/**
 * Checks whether a person has ALL of the specified capabilities.
 */
export async function hasAllCapabilities(
  tenantClient: SupabaseClient,
  personId: string,
  capabilityKeys: string[],
): Promise<boolean> {
  const capabilities = await resolveCapabilities(tenantClient, personId);
  const resolvedKeys = new Set(capabilities.map(c => c.key));
  return capabilityKeys.every(k => resolvedKeys.has(k));
}

/**
 * Returns the capability keys as a flat string array.
 * Useful for embedding in JWT claims.
 */
export async function resolveCapabilityKeys(
  tenantClient: SupabaseClient,
  personId: string,
): Promise<string[]> {
  const capabilities = await resolveCapabilities(tenantClient, personId);
  return capabilities.map(c => c.key);
}
