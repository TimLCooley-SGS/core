# SGS Core — Project Summary

## What Is SGS Core?

SGS Core is a **customer relationship management (CRM) platform** built for nonprofit and community organizations (theaters, gardens, community centers, etc.). It helps these organizations manage their **members, donors, visitors, staff, events, tickets, and memberships** all in one place.

Think of it like Salesforce, but purpose-built for smaller community organizations — simpler, more affordable, and tailored to their specific needs.

---

## How It's Organized

The system has **two layers**:

### 1. The Control Plane (the "front desk" of the whole platform)
One central database that SGS manages. It knows:
- **Which organizations** are on the platform (name, URL, status)
- **Which people have logins** and which organizations they belong to
- **SGS staff** who manage the platform itself
- **An audit trail** of everything that happens at the platform level (who created an org, who deleted one, etc.)

### 2. Tenant Databases (one private database per organization)
Each organization gets its own completely separate database. This means:
- **Each organization's data is completely isolated from any other organization's data**
- If one org has a security issue, it doesn't affect others
- Each org's data can be managed, backed up, or deleted independently
- This is important for **SOC2 compliance** (a security certification)

---

## What's In Each Organization's Database?

Each organization's database tracks:

| Area | What It Stores |
|------|----------------|
| **People** | Contact records — name, email, phone, address. This is the central hub. A person can be a member, donor, visitor, or staff — those aren't separate buckets, they're relationships. |
| **Households** | Groups of people who live together (families). Useful for family memberships. Each person has a role: primary, co-primary, dependent, or other. |
| **Memberships** | Membership plans (name, price, duration, number of seats) and active memberships tied to people or households. Tracks which "seats" on a membership are assigned to which people. |
| **Donations** | Donation records — who gave, how much, when, for what campaign. |
| **Visits** | Check-in records — who visited, when, what type (day pass, member visit, event, etc.). |
| **Staff & Permissions** | Staff assignments (who works here), roles (Org Admin, Manager, Front Desk, Volunteer), and fine-grained capabilities (what each role can do). |
| **Duplicate Detection** | Tools to find and merge duplicate person records — with full tracking of what was changed. |
| **Audit Log** | Append-only record of every change. Cannot be edited or deleted — this is required for SOC2. |

---

## What's In the Platform Database (Control Plane)?

| Area | What It Stores |
|------|----------------|
| **Organizations** | Registry of all orgs — name, URL slug, connection credentials to their private database, billing status (Stripe), current status (active, suspended, archived). |
| **Global Identities** | One record per person who has a login. A single login can access multiple organizations. |
| **Identity-Org Links** | The routing table — "Tim's login is connected to Olympia Gardens, and his person record in that org's database is XYZ." |
| **SGS Staff** | Internal platform team members — admins, support, engineering, billing. |
| **Impersonation Sessions** | When SGS support needs to log in as an org user to help troubleshoot, it's tracked here with a required reason. |
| **Platform Audit Log** | Immutable record of platform-level actions — org created, org deleted, status changed, etc. |

---

## What's Been Built (The Web Application)

The web app is live at **sgscore-core.vercel.app** and includes:

### Admin Panel (for SGS staff)
- **Organization list** — Search and filter all organizations on the platform
- **Create Organization** — A form that automatically:
  1. Creates the admin user account
  2. Spins up a new private database for the org
  3. Waits for it to be ready (30–120 seconds)
  4. Runs all the database setup (tables, roles, permissions)
  5. Creates the org admin in the new database
  6. Activates the organization
  7. Sends a welcome email with a sign-in link
  - Shows real-time progress with checkmarks for each step
- **Organization detail page** — View org info, change status (suspend/archive/activate), or permanently delete
- **Delete Organization** — Step-by-step removal of the database, all records, and audit logging
- **Enter Organization** — SGS staff can click into any active org's dashboard with full access (no separate login needed)
- **Staff management** — View and manage SGS platform staff
- **Audit log** — View all platform-level actions

### Organization Dashboard (for org staff)
- **Sidebar navigation** — Tickets, Donations, Memberships, Events, Analytics, Contacts, Settings
- **Permission-based visibility** — Menu items only appear if the logged-in user has the right capabilities
- **Placeholder pages** — The dashboard skeleton is in place; the actual feature pages (ticket sales, donation tracking, etc.) are next to build

### Authentication
- **Magic link login** — Users sign in via email (no passwords). They receive a one-time link that logs them in.
- **Automatic routing** — After login, users are sent to the right place: org dashboard if they belong to one org, org picker if they belong to multiple, or admin panel if they're SGS staff.

---

## Tech Stack (for technical stakeholders)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (React), Tailwind CSS, Radix UI components |
| Backend | Next.js server actions, Supabase (PostgreSQL + Auth) |
| Database | Supabase — one project for the control plane, one per org |
| Email | SendGrid |
| Payments | Stripe Connect (wired up, not yet active) |
| Hosting | Vercel |
| Code Structure | Monorepo (Turborepo + pnpm) with shared packages for types, UI components, and API logic |

---

## What's Next

The foundation is complete. The next phase is building out the actual org-level features:
- Ticket sales and scanning
- Membership management and renewals
- Donation tracking and receipts
- Event management
- Contact/people management with search and dedup
- Analytics dashboards
- POS storefront (the second app — customer-facing, per-org branded)
