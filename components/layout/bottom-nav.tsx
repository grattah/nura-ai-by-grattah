"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid2X2, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Categories", href: "/recipes", icon: Grid2X2 },
  { label: "Saved", href: "/protected", icon: Bookmark },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md border-t border-border/40 pb-safe">
      <div className="flex items-center justify-around px-2 h-16">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-16 min-h-11 px-2 py-1 rounded-xl transition-all duration-150 active:scale-95",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={label}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-all duration-150",
                  active ? "stroke-[2.5px]" : "stroke-[1.75px]",
                )}
              />
              <span
                className={cn(
                  "text-[11px] font-medium leading-none",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {active && (
                <span
                  className="absolute bottom-0 w-1 h-1 rounded-full"
                  style={{ backgroundColor: "#E8836A" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
