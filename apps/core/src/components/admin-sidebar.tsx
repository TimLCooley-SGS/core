"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, ScrollText } from "lucide-react";
import { cn } from "@sgscore/ui";
import type { SgsStaffRole } from "@sgscore/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Organizations", href: "/admin/orgs", icon: Building2 },
  { label: "Staff", href: "/admin/staff", icon: Users },
  { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
];

export function AdminSidebar({ staffRole }: { staffRole: SgsStaffRole }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-[#1a1025] text-white">
      <div className="flex h-16 items-center px-6">
        <Link
          href="/admin/orgs"
          className="text-xl font-heading font-bold tracking-tight"
        >
          SGS Platform
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
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
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-xs text-white/50">Platform Staff</p>
        <p className="truncate text-sm capitalize text-white/70">
          {staffRole}
        </p>
      </div>
    </aside>
  );
}
