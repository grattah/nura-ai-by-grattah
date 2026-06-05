"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IoMdHome } from "react-icons/io";
import { Search, Users, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: IoMdHome },
  { label: "Find recipe", href: "/recipes", icon: Search },
  { label: "Community", href: "/community", icon: Users },
  { label: "Saved", href: "/bookmarks", icon: Bookmark },
] as const;

const HIDE_ON = ["/personalized-search"];

export function BottomNav() {
  const pathname = usePathname();

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky bottom-2 z-40 w-[93%] mx-auto pb-safe">
      <div
        className="mx-0 flex items-center justify-around px-2 h-16 rounded-xl"
        style={{ backgroundColor: "#227B6F" }}
      >
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-2 min-w-16 min-h-11 px-2 py-1 rounded-xl transition-all duration-150 active:scale-95"
              aria-label={label}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-all duration-150",
                  active ? "text-white" : "text-white/45",
                )}
                strokeWidth={active ? 2.5 : 1.75}
                size={20}
              />
              <span
                className={cn(
                  "text-[11px] font-medium leading-none transition-colors duration-150",
                  active ? "text-white" : "text-white/45",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
