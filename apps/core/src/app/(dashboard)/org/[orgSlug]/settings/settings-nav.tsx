"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@sgscore/ui";
import { useOrg } from "@/components/org-provider";

interface NavItem {
  label: string;
  segment: string;
}

const items: NavItem[] = [
  { label: "General", segment: "general" },
  { label: "Locations", segment: "location" },
  { label: "Team", segment: "team" },
];

export function SettingsNav() {
  const pathname = usePathname();
  const { org } = useOrg();
  const basePath = `/org/${org.slug}/settings`;

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const href = `${basePath}/${item.segment}`;
        const isActive = pathname.startsWith(href);

        return (
          <Link
            key={item.segment}
            href={href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
