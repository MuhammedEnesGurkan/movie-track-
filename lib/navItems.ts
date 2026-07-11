import { Home, LayoutGrid, Search, User, type LucideIcon } from "lucide-react";

export type NavKey = "ev" | "ara" | "kutuphane" | "profil";

export type NavItem = {
  key: NavKey;
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { key: "ev", href: "/", label: "Ev", icon: Home },
  { key: "ara", href: "/?focus=search", label: "Ara", icon: Search },
  { key: "kutuphane", href: "/profile?view=library", label: "Kütüphane", icon: LayoutGrid },
  { key: "profil", href: "/profile", label: "Profil", icon: User },
];

export function isNavItemActive(pathname: string, params: URLSearchParams, key: NavKey) {
  const focus = params.get("focus");
  const view = params.get("view");

  if (key === "ev") return pathname === "/" && focus !== "search";
  if (key === "ara") return pathname === "/" && focus === "search";
  if (key === "kutuphane") return pathname === "/profile" && view === "library";
  if (key === "profil") return pathname === "/profile" && view !== "library";
  return false;
}
