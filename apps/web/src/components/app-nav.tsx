"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@betri/db/schema";

interface NavItem {
  href: string;
  label: string;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  athlete: [
    { href: "/athlete", label: "Dashboard" },
    { href: "/athlete/activities", label: "Activities" },
    { href: "/athlete/calendar", label: "Calendar" },
    { href: "/chat", label: "Chat" },
    { href: "/athlete/connections", label: "Connections" },
  ],
  coach: [
    { href: "/coach", label: "Dashboard" },
    { href: "/coach/athletes", label: "Athletes" },
    { href: "/chat", label: "Chat" },
  ],
};

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // Dashboard roots (/athlete, /coach) only match exactly, otherwise every
  // sub-page would highlight Dashboard.
  if (href === "/athlete" || href === "/coach") return false;
  return pathname.startsWith(href + "/");
}

export function AppNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];

  return (
    <nav className="flex items-center gap-4 text-sm">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "font-medium text-foreground"
                : "text-muted-foreground transition-colors hover:text-foreground"
            }
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
