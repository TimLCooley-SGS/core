import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrgByIdAdmin, getOrgMemberCount } from "@sgscore/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Separator,
} from "@sgscore/ui";
import { ArrowLeft } from "lucide-react";
import { OrgActions } from "./org-actions";
import type { OrgStatus } from "@sgscore/types";

const statusColors: Record<OrgStatus, string> = {
  provisioning: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  archived: "bg-gray-100 text-gray-800",
};

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const org = await getOrgByIdAdmin(orgId);
  if (!org) notFound();

  const memberCount = await getOrgMemberCount(orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/orgs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <Badge variant="secondary" className={statusColors[org.status]}>
          {org.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="ID" value={org.id} mono />
            <DetailRow label="Slug" value={org.slug} />
            <DetailRow label="Plan Tier" value={org.plan_tier ?? "—"} />
            <DetailRow label="Members" value={String(memberCount)} />
            <DetailRow
              label="Created"
              value={new Date(org.created_at).toLocaleDateString()}
            />
            <DetailRow
              label="Updated"
              value={new Date(org.updated_at).toLocaleDateString()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Infrastructure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow
              label="Supabase Project"
              value={org.supabase_project_id ?? "Not provisioned"}
            />
            <DetailRow
              label="Supabase URL"
              value={org.supabase_url ?? "—"}
              mono
            />
            <DetailRow
              label="Stripe Account"
              value={org.stripe_connect_account_id ?? "Not connected"}
            />
            <DetailRow
              label="Stripe Onboarded"
              value={org.stripe_onboarding_complete ? "Yes" : "No"}
            />
            <DetailRow
              label="API Keys"
              value={
                org.supabase_anon_key ? "Configured" : "Not configured"
              }
            />
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgActions orgId={org.id} currentStatus={org.status} />
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs truncate max-w-[240px]" : "truncate"}>
        {value}
      </span>
    </div>
  );
}
