"use client";

import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@sgscore/ui";
import { signOut } from "@/app/actions";

export function UserMenu({
  initials,
  orgName,
  settingsHref,
}: {
  initials: string;
  orgName: string;
  settingsHref?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{orgName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {settingsHref && (
          <DropdownMenuItem asChild>
            <Link href={settingsHref}>Settings</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <form action={signOut}>
            <button type="submit" className="w-full text-left">
              Log out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
