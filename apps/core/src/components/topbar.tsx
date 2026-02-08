"use client";

import { useOrg } from "./org-provider";
import { Avatar, AvatarFallback } from "@sgscore/ui";

export function Topbar() {
  const { org } = useOrg();

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div>
        <h2 className="text-lg font-semibold">{org.name}</h2>
      </div>
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            U
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
