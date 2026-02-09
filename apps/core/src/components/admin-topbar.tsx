import { Badge } from "@sgscore/ui";
import { UserMenu } from "./user-menu";
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
      <UserMenu initials={initials} orgName="Platform Admin" />
    </header>
  );
}
