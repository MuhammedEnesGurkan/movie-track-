"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { NAV_ITEMS, isNavItemActive } from "@/lib/navItems";

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-white/5 bg-card lg:flex">
      <div className="flex items-center gap-2 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-bg text-accent">
          <Clapperboard size={18} />
        </div>
        <span className="text-sm font-bold">WatchList</span>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ key, href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, searchParams, key);
          return (
            <Link
              key={key}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/5 ${
                active ? "text-accent" : "text-white/60"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
