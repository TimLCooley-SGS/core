"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, Card, CardContent, Badge } from "@sgscore/ui";
import { Pencil, Send, Loader2 } from "lucide-react";
import { useOrg } from "@/components/org-provider";
import type { SystemEmailTemplate, MembershipEmailRule } from "../actions";
import { MembershipRulesSection } from "./membership-rules-section";
import { sendTestEmailAction } from "../../email/test-email-action";

interface SystemEmailsListProps {
  ticketTemplates: SystemEmailTemplate[];
  membershipTemplates: SystemEmailTemplate[];
  donationTemplates: SystemEmailTemplate[];
  membershipRules: MembershipEmailRule[];
}

function TemplateCard({ template }: { template: SystemEmailTemplate }) {
  const { org } = useOrg();
  const [isPending, startTransition] = useTransition();
  const [testResult, setTestResult] = useState<string | null>(null);

  function handleSendTest() {
    startTransition(async () => {
      setTestResult(null);
      const result = await sendTestEmailAction(org.slug, template.id);
      setTestResult(result.error ?? "Test email sent!");
    });
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4 px-5">
        <div className="min-w-0">
          <h4 className="text-sm font-medium truncate">{template.name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last edited {new Date(template.updated_at).toLocaleDateString()}
          </p>
          {testResult && (
            <p className={`text-xs mt-1 ${testResult.startsWith("Test") ? "text-green-600" : "text-destructive"}`}>
              {testResult}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleSendTest}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send Test
          </Button>
          <Link href={`/org/${org.slug}/communication/email/${template.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function SystemEmailsList({
  ticketTemplates,
  membershipTemplates,
  donationTemplates,
  membershipRules,
}: SystemEmailsListProps) {
  return (
    <div className="space-y-8">
      {/* Ticket Emails */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold">Ticket Emails</h3>
          <Badge variant="secondary">{ticketTemplates.length}</Badge>
        </div>
        <div className="space-y-2">
          {ticketTemplates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
          {ticketTemplates.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No ticket email templates found. Run the system email seed to create them.
            </p>
          )}
        </div>
      </section>

      {/* Membership Emails */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold">Membership Emails</h3>
          <Badge variant="secondary">{membershipTemplates.length}</Badge>
        </div>
        <div className="space-y-2">
          {membershipTemplates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
          {membershipTemplates.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No membership email templates found. Run the system email seed to create them.
            </p>
          )}
        </div>
      </section>

      {/* Donation Emails */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold">Donation Emails</h3>
          <Badge variant="secondary">{donationTemplates.length}</Badge>
        </div>
        <div className="space-y-2">
          {donationTemplates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
          {donationTemplates.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No donation email templates found. Run the system email seed to create them.
            </p>
          )}
        </div>
      </section>

      {/* Membership Rules */}
      <MembershipRulesSection
        rules={membershipRules}
        membershipTemplates={membershipTemplates}
      />
    </div>
  );
}
