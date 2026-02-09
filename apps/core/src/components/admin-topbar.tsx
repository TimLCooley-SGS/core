import Link from "next/link";
import { Badge, Avatar, AvatarFallback } from "@sgscore/ui";
import type { SgsStaffRole } from "@sgscore/types";

export function AdminTopbar({
  staffRole,
  initials,
}: {
  staffRole: SgsStaffRole;
  initials: string;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Platform Administration</h2>
        <Badge variant="secondary" className="capitalize">
          {staffRole}
        </Badge>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/org-picker"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to Orgs
        </Link>
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
