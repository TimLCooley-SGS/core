import Link from "next/link";
import { getAllOrganizations } from "@sgscore/api";
import { Button } from "@sgscore/ui";
import { Plus } from "lucide-react";
import { OrgSearchFilter } from "./org-search-filter";

export default async function AdminOrgsPage() {
  const orgs = await getAllOrganizations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-sm text-muted-foreground">
            {orgs.length} organization{orgs.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/orgs/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Link>
        </Button>
      </div>

      <OrgSearchFilter orgs={orgs} />
    </div>
  );
}
