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
      <div
        className="mx-0 flex items-center justify-between p-1 rounded-full bg-background/20 backdrop-blur-lg"
      >
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn("flex flex-col items-center gap-1 py-2 px-4 rounded-full transition-all duration-150 active:scale-95",
                active ? "bg-neutral-400/50 backdrop-blur-[1px]" : ""
              )}
              aria-label={label}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-all duration-150",
                  active ? "text-[#0A4A41]" : "text-[#57605E]",
                )}
                strokeWidth={active ? 2.5 : 1.75}
                size={20}
              />
              <span
                className={cn(
                  "text-[12px] font-medium leading-none transition-colors duration-150",
                  active ? "text-[#0A4A41]" : "text-[#57605E]",
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
