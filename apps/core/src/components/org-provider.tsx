"use client";

import { createContext, useContext } from "react";

interface OrgContextValue {
  org: { id: string; name: string; slug: string };
  capabilities: string[];
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}

export function useHasCapability(key: string): boolean {
  const { capabilities } = useOrg();
  return capabilities.includes(key);
}

export function OrgProvider({
  org,
  capabilities,
  children,
}: OrgContextValue & { children: React.ReactNode }) {
  return (
    <OrgContext.Provider value={{ org, capabilities }}>
      {children}
    </OrgContext.Provider>
  );
}
