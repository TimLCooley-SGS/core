"use client";

import { useState } from "react";
import Link from "next/link";
import { Input, Badge, Card, CardContent } from "@sgscore/ui";
import { Search } from "lucide-react";
import type { Organization, OrgStatus } from "@sgscore/types";

const statusColors: Record<OrgStatus, string> = {
  provisioning: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  archived: "bg-gray-100 text-gray-800",
};

export function OrgSearchFilter({ orgs }: { orgs: Organization[] }) {
  const [search, setSearch] = useState("");

  const filtered = orgs.filter(
    (org) =>
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {search ? "No organizations match your search." : "No organizations yet."}
        </p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((org) => (
            <Link key={org.id} href={`/admin/orgs/${org.id}`}>
              <Card className="transition-colors hover:bg-secondary/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">{org.slug}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {org.plan_tier && (
                      <span className="text-xs text-muted-foreground">
                        {org.plan_tier}
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className={statusColors[org.status]}
                    >
                      {org.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
