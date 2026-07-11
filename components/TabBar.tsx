"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV_ITEMS, isNavItemActive } from "@/lib/navItems";

export default function TabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/5 bg-bg/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md justify-around">
        {NAV_ITEMS.map(({ key, href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, searchParams, key);
          return (
            <Link
              key={key}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs"
            >
              <Icon size={22} strokeWidth={2} className={active ? "text-accent" : "text-white/50"} />
              <span className={active ? "text-accent" : "text-white/50"}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
