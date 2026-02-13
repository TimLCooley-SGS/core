"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Users,
  ScrollText,
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
import type { SgsStaffRole } from "@sgscore/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Organizations", href: "/admin/orgs", icon: Building2 },
  { label: "Team", href: "/admin/team", icon: Users },
  { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar({ staffRole }: { staffRole: SgsStaffRole }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-full flex-col bg-[#1a1025] text-white transition-all duration-200",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex h-16 items-center justify-between px-3">
          {!collapsed && (
            <Link
              href="/admin/orgs"
              className="pl-3 text-xl font-heading font-bold tracking-tight"
            >
              SGS Platform
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
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);

            const link = (
              <Link
                key={item.href}
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
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="truncate text-center text-xs capitalize text-white/70">
                  {staffRole.charAt(0).toUpperCase()}
                </p>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-xs text-muted-foreground">Platform Team</p>
                <p className="capitalize">{staffRole}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <p className="truncate text-xs text-white/50">Platform Team</p>
              <p className="truncate text-sm capitalize text-white/70">
                {staffRole}
              </p>
            </>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
