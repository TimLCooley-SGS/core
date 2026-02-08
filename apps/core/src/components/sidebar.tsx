"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Ticket,
  Heart,
  Users,
  CalendarDays,
  BarChart3,
  Contact,
  Settings,
} from "lucide-react";
import { cn } from "@sgscore/ui";
import { useOrg, useHasCapability } from "./org-provider";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  capability?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const { org } = useOrg();

  const navItems: NavItem[] = [
    { label: "Tickets", href: `/org/${org.slug}/tickets`, icon: Ticket, capability: "tickets.read" },
    { label: "Donations", href: `/org/${org.slug}/donations`, icon: Heart, capability: "donations.read" },
    { label: "Memberships", href: `/org/${org.slug}/memberships`, icon: Users, capability: "memberships.read" },
    { label: "Events", href: `/org/${org.slug}/events`, icon: CalendarDays, capability: "events.read" },
    { label: "Analytics", href: `/org/${org.slug}/analytics`, icon: BarChart3, capability: "analytics.read" },
    { label: "Contacts", href: `/org/${org.slug}/contacts`, icon: Contact, capability: "persons.read" },
    { label: "Settings", href: `/org/${org.slug}/settings`, icon: Settings, capability: "settings.read" },
  ];

  return (
    <aside className="flex h-full w-64 flex-col bg-[#4E2C70] text-white">
      <div className="flex h-16 items-center px-6">
        <Link href="/org-picker" className="text-xl font-heading font-bold tracking-tight">
          SGS Core
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <SidebarItem key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm text-white/70">{org.name}</p>
      </div>
    </aside>
  );
}

function SidebarItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const hasAccess = item.capability
    ? useHasCapability(item.capability)
    : true;

  if (!hasAccess) return null;

  const isActive = pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-white/15 text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
}
