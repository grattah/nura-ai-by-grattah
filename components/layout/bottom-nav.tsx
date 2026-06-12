"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IoMdHome } from "react-icons/io";
import { Search, Users, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: IoMdHome },
  { label: "Find recipe", href: "/find-recipe", icon: Search },
  { label: "Community", href: "/community", icon: Users },
  { label: "Saved", href: "/bookmarks", icon: Bookmark },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky bottom-2 z-40 w-[93%] mx-auto pb-safe">
      <div className="mx-0 flex items-center p-1 rounded-full overflow-hidden liquid-glass border-2 backdrop-blur-xs">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "w-full flex flex-col items-center gap-0.5 py-2 px-3 rounded-full transition-all duration-150 active:scale-95",
                active ? "bg-black/12" : "",
              )}
              aria-label={label}
            >
              <Icon
                className={cn(
                  "size-4 transition-all duration-150",
                  active ? "text-[#0A4A41]" : "text-subtle",
                )}
                strokeWidth={active ? 2.3 : 1.67}
                size={16}
              />
              <span
                className={cn(
                  "text-sm leading-none transition-colors duration-150 text-nowrap",
                  active
                    ? "text-[#0A4A41] font-semibold"
                    : "text-subtle font-medium",
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
