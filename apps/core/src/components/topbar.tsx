"use client";

import { useOrg } from "./org-provider";
import { UserMenu } from "./user-menu";

export function Topbar({
  initials,
  avatarUrl,
}: {
  initials: string;
  avatarUrl?: string | null;
}) {
  const { org } = useOrg();

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div>
        <h2 className="text-lg font-semibold">{org.name}</h2>
      </div>
      <UserMenu
        initials={initials}
        orgName={org.name}
        avatarUrl={avatarUrl}
        accountHref={`/org/${org.slug}/account`}
        settingsHref={`/org/${org.slug}/settings`}
      />
    </header>
  );
}
