"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Search, LayoutGrid, User } from "lucide-react";

const items = [
  { key: "ev", href: "/", label: "Ev", icon: Home },
  { key: "ara", href: "/?focus=search", label: "Ara", icon: Search },
  { key: "kutuphane", href: "/profile?view=library", label: "Kütüphane", icon: LayoutGrid },
  { key: "profil", href: "/profile", label: "Profil", icon: User },
];

function isActive(pathname: string, params: URLSearchParams, key: string) {
  const focus = params.get("focus");
  const view = params.get("view");

  if (key === "ev") return pathname === "/" && focus !== "search";
  if (key === "ara") return pathname === "/" && focus === "search";
  if (key === "kutuphane") return pathname === "/profile" && view === "library";
  if (key === "profil") return pathname === "/profile" && view !== "library";
  return false;
}

export default function TabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/5 bg-[#0d1117]/95 backdrop-blur">
      <div className="mx-auto flex max-w-md justify-around">
        {items.map(({ key, href, label, icon: Icon }) => {
          const active = isActive(pathname, searchParams, key);
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
