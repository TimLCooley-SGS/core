import { getSystemEmailTemplates, getMembershipEmailRules } from "./actions";
import { SystemEmailsList } from "./components/system-emails-list";

export default async function SystemEmailsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const [templates, rules] = await Promise.all([
    getSystemEmailTemplates(orgSlug),
    getMembershipEmailRules(orgSlug),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">System Emails</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage automated email templates for tickets, memberships, and donations.
        </p>
      </div>
      <SystemEmailsList
        ticketTemplates={templates.ticket}
        membershipTemplates={templates.membership}
        donationTemplates={templates.donation}
        membershipRules={rules}
      />
    </div>
  );
}
