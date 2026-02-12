"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, User } from "lucide-react";
import { cn } from "@sgscore/ui";
import { useCart } from "@/lib/cart-provider";
import type { PosNavItem } from "@sgscore/types";

interface PosHeaderProps {
  orgSlug: string;
  orgName: string;
  logoUrl?: string | null;
  navItems: PosNavItem[];
}

export function PosHeader({
  orgSlug,
  orgName,
  logoUrl,
  navItems,
}: PosHeaderProps) {
  const pathname = usePathname();
  const { itemCount } = useCart();

  const visibleItems = navItems
    .filter((n) => n.visible)
    .sort((a, b) => a.order - b.order);

  function getHref(key: string) {
    if (key === "home") return `/${orgSlug}`;
    return `/${orgSlug}/${key}`;
  }

  function isActive(key: string) {
    const href = getHref(key);
    if (key === "home") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo + name */}
        <Link href={`/${orgSlug}`} className="flex items-center gap-3">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={`${orgName} logo`} className="h-10 w-auto" />
          )}
          <span className="text-xl font-heading font-bold">{orgName}</span>
        </Link>

        {/* Icons */}
        <div className="flex items-center gap-4">
          <Link
            href={`/${orgSlug}/cart`}
            className="relative hover:text-primary"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
          <Link
            href={`/${orgSlug}/portal`}
            className="hover:text-primary"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Navigation tabs */}
      {visibleItems.length > 0 && (
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4">
          <div className="flex gap-1">
            {visibleItems.map((item) => (
              <Link
                key={item.key}
                href={getHref(item.key)}
                className={cn(
                  "whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  isActive(item.key)
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
