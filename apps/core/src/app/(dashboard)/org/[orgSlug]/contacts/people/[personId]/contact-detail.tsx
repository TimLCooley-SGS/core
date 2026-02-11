"use client";

import type {
  PersonDetail,
  HouseholdMemberRow,
  DonationRow,
  VisitRow,
  MembershipSeatRow,
  AuditLogRow,
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
}: ContactDetailProps) {
  return (
    <div className="flex gap-6">
      <aside className="w-80 shrink-0">
        <ContactSidebar
          orgSlug={orgSlug}
          person={person}
          householdMembers={householdMembers}
          householdPeers={householdPeers}
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
  );
}
