"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, ListChecks, BarChart3, Settings } from "lucide-react";

const TABS = [
  { href: "/add", label: "Add", Icon: Plus },
  { href: "/expenses", label: "Expenses", Icon: ListChecks },
  { href: "/analytics", label: "Stats", Icon: BarChart3 },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur safe-pb"
      aria-label="Primary"
    >
      <ul className="mx-auto max-w-md grid grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors ${
                  active ? "text-brand" : "text-muted hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
