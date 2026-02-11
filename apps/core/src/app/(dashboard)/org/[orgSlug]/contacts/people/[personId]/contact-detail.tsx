"use client";

import { useRouter } from "next/navigation";
import { Button } from "@sgscore/ui";
import { ArrowLeft } from "lucide-react";
import type {
  PersonDetail,
  HouseholdMemberRow,
  DonationRow,
  VisitRow,
  MembershipSeatRow,
  AuditLogRow,
  PersonTagRow,
  TagRow,
} from "./page";
import { ContactSidebar } from "./contact-sidebar";
import { ContactTabs } from "./contact-tabs";

interface ContactDetailProps {
  orgSlug: string;
  person: PersonDetail;
  householdMembers: HouseholdMemberRow[];
  householdPeers: HouseholdMemberRow[];
  donations: DonationRow[];
  visits: VisitRow[];
  seats: MembershipSeatRow[];
  auditLog: AuditLogRow[];
  personTags: PersonTagRow[];
  allTags: TagRow[];
}

export function ContactDetail({
  orgSlug,
  person,
  householdMembers,
  householdPeers,
  donations,
  visits,
  seats,
  auditLog,
  personTags,
  allTags,
}: ContactDetailProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div className="flex gap-6">
        <aside className="w-80 shrink-0">
          <ContactSidebar
            orgSlug={orgSlug}
            person={person}
            householdMembers={householdMembers}
            householdPeers={householdPeers}
            personTags={personTags}
            allTags={allTags}
          />
        </aside>
        <div className="flex-1 min-w-0">
          <ContactTabs
            person={person}
            donations={donations}
            visits={visits}
            seats={seats}
            auditLog={auditLog}
          />
        </div>
      </div>
    </div>
  );
}
