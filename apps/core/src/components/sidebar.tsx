"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  Heart,
  Users,
  CalendarDays,
  BarChart3,
  Contact,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  cn,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@sgscore/ui";
import { useOrg, useHasCapability } from "./org-provider";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  capability?: string;
  exact?: boolean;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { org } = useOrg();

  const navItems: NavItem[] = [
    { label: "Dashboard", href: `/org/${org.slug}`, icon: LayoutDashboard, exact: true },
    { label: "Tickets", href: `/org/${org.slug}/tickets`, icon: Ticket, capability: "tickets.read" },
    { label: "Donations", href: `/org/${org.slug}/donations`, icon: Heart, capability: "donations.read" },
    { label: "Memberships", href: `/org/${org.slug}/memberships`, icon: Users, capability: "memberships.read" },
    { label: "Events", href: `/org/${org.slug}/events`, icon: CalendarDays, capability: "events.read" },
    { label: "Analytics", href: `/org/${org.slug}/analytics`, icon: BarChart3, capability: "analytics.read" },
    { label: "Contacts", href: `/org/${org.slug}/contacts`, icon: Contact, capability: "people.read" },
    { label: "Settings", href: `/org/${org.slug}/settings`, icon: Settings, capability: "settings.read" },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-full flex-col bg-[#4E2C70] text-white transition-all duration-200",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex h-16 items-center justify-between px-3">
          {!collapsed && (
            <Link
              href="/org-picker"
              className="pl-3 text-xl font-heading font-bold tracking-tight"
            >
              SGS Core
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors",
              collapsed && "mx-auto",
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="truncate text-center text-xs text-white/70">
                  {org.name.charAt(0)}
                </p>
              </TooltipTrigger>
              <TooltipContent side="right">{org.name}</TooltipContent>
            </Tooltip>
          ) : (
            <p className="truncate text-sm text-white/70">{org.name}</p>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

function SidebarItem({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const hasAccess = item.capability
    ? useHasCapability(item.capability)
    : true;

  if (!hasAccess) return null;

  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);

  const link = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        collapsed ? "justify-center" : "gap-3",
        isActive
          ? "bg-white/15 text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!collapsed && item.label}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
