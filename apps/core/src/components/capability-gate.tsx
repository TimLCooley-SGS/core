"use client";

import { useOrg } from "./org-provider";

interface CapabilityGateProps {
  /** Render children only if user has this capability */
  capability?: string;
  /** Render children only if user has ANY of these capabilities */
  anyOf?: string[];
  /** Render children only if user has ALL of these capabilities */
  allOf?: string[];
  /** Fallback to render if capability check fails */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function CapabilityGate({
  capability,
  anyOf,
  allOf,
  fallback = null,
  children,
}: CapabilityGateProps) {
  const { capabilities } = useOrg();

  let allowed = false;

  if (capability) {
    allowed = capabilities.includes(capability);
  } else if (anyOf) {
    allowed = anyOf.some((c) => capabilities.includes(c));
  } else if (allOf) {
    allowed = allOf.every((c) => capabilities.includes(c));
  } else {
    allowed = true;
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}
