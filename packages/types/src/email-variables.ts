// ---------------------------------------------------------------------------
// Email merge variable catalog
// ---------------------------------------------------------------------------

export interface EmailVariable {
  key: string;
  label: string;
  category: string;
  sampleValue: string;
}

export const EMAIL_VARIABLE_CATALOG: EmailVariable[] = [
  // Contact
  { key: "first_name", label: "First Name", category: "Contact", sampleValue: "Jane" },
  { key: "last_name", label: "Last Name", category: "Contact", sampleValue: "Doe" },
  { key: "display_name", label: "Display Name", category: "Contact", sampleValue: "Jane Doe" },
  { key: "email", label: "Email", category: "Contact", sampleValue: "jane@example.com" },
  { key: "phone", label: "Phone", category: "Contact", sampleValue: "(555) 123-4567" },
  { key: "date_of_birth", label: "Date of Birth", category: "Contact", sampleValue: "1990-01-15" },
  { key: "city", label: "City", category: "Contact", sampleValue: "Portland" },
  { key: "state", label: "State", category: "Contact", sampleValue: "OR" },
  { key: "postal_code", label: "Postal Code", category: "Contact", sampleValue: "97201" },
  { key: "country", label: "Country", category: "Contact", sampleValue: "US" },

  // Ticket
  { key: "ticket_name", label: "Ticket Name", category: "Ticket", sampleValue: "General Admission" },
  { key: "ticket_date", label: "Ticket Date", category: "Ticket", sampleValue: "March 15, 2026" },
  { key: "ticket_time", label: "Ticket Time", category: "Ticket", sampleValue: "2:00 PM" },
  { key: "ticket_location", label: "Ticket Location", category: "Ticket", sampleValue: "Main Hall" },
  { key: "ticket_count", label: "Ticket Count", category: "Ticket", sampleValue: "2" },
  { key: "ticket_price", label: "Ticket Price", category: "Ticket", sampleValue: "$25.00" },
  { key: "confirmation_number", label: "Confirmation Number", category: "Ticket", sampleValue: "TKT-20260315-A1B2" },

  // Membership
  { key: "plan_name", label: "Plan Name", category: "Membership", sampleValue: "Family Annual" },
  { key: "membership_status", label: "Membership Status", category: "Membership", sampleValue: "Active" },
  { key: "start_date", label: "Start Date", category: "Membership", sampleValue: "January 1, 2026" },
  { key: "expiration_date", label: "Expiration Date", category: "Membership", sampleValue: "December 31, 2026" },
  { key: "seat_count", label: "Seat Count", category: "Membership", sampleValue: "4" },
  { key: "membership_price", label: "Membership Price", category: "Membership", sampleValue: "$150.00" },

  // Donation
  { key: "donation_amount", label: "Donation Amount", category: "Donation", sampleValue: "$100.00" },
  { key: "donation_date", label: "Donation Date", category: "Donation", sampleValue: "February 10, 2026" },
  { key: "donation_campaign", label: "Campaign", category: "Donation", sampleValue: "Annual Fund" },
  { key: "receipt_number", label: "Receipt Number", category: "Donation", sampleValue: "DON-20260210-X7Y8" },

  // Organization
  { key: "org_name", label: "Organization Name", category: "Organization", sampleValue: "Olympia Gardens" },
  { key: "org_email", label: "Organization Email", category: "Organization", sampleValue: "info@olympiagardens.org" },
  { key: "org_phone", label: "Organization Phone", category: "Organization", sampleValue: "(555) 987-6543" },

  // System
  { key: "unsubscribe_url", label: "Unsubscribe URL", category: "System", sampleValue: "https://example.com/unsubscribe" },
  { key: "current_date", label: "Current Date", category: "System", sampleValue: "February 12, 2026" },
  { key: "current_year", label: "Current Year", category: "System", sampleValue: "2026" },
];

export function getVariablesByCategory(): Record<string, EmailVariable[]> {
  const map: Record<string, EmailVariable[]> = {};
  for (const v of EMAIL_VARIABLE_CATALOG) {
    if (!map[v.category]) map[v.category] = [];
    map[v.category].push(v);
  }
  return map;
}

export function replaceVariables(
  html: string,
  values: Record<string, string>,
): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return values[key] ?? match;
  });
}

export function replaceWithSampleData(html: string): string {
  const sampleValues: Record<string, string> = {};
  for (const v of EMAIL_VARIABLE_CATALOG) {
    sampleValues[v.key] = v.sampleValue;
  }
  return replaceVariables(html, sampleValues);
}
