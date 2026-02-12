"use client";

import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
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
  avatarUrl,
  accountHref,
  settingsHref,
}: {
  initials: string;
  orgName: string;
  avatarUrl?: string | null;
  accountHref?: string;
  settingsHref?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar>
            {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile photo" />}
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{orgName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accountHref && (
          <DropdownMenuItem asChild>
            <Link href={accountHref}>Personal Settings</Link>
          </DropdownMenuItem>
        )}
        {settingsHref && (
          <DropdownMenuItem asChild>
            <Link href={settingsHref}>Settings</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => signOut()}
          className="cursor-pointer"
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
