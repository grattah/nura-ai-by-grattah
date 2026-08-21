"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiMiniHome } from "react-icons/hi2";
import { FaBookmark } from "react-icons/fa";
import { CommunityIcon, CommunityIconActive } from "../vectors/community-icon";
import { SearchIcon } from "@/components/vectors/search-icon";
import { Home, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home, activeIcon: HiMiniHome },
  {
    label: "Find recipe",
    href: "/find-recipe",
    icon: SearchIcon,
    activeIcon: SearchIcon,
  },
  {
    label: "Activities",
    href: "/community",
    icon: CommunityIcon,
    activeIcon: CommunityIconActive,
  },
  {
    label: "Saved",
    href: "/bookmarks",
    icon: Bookmark,
    activeIcon: FaBookmark,
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-2 inset-x-0 z-40 w-84.5 mx-auto pb-safe">
      <div className="mx-0 flex items-center p-1 rounded-full overflow-hidden liquid-glass border-2 backdrop-blur-xs w-fit">
        {NAV_ITEMS.map(
          ({ label, href, icon: Icon, activeIcon: ActiveIcon }) => {
            const active = isActive(href);
            const IconComponent = ActiveIcon;

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "w-20.5 h-[56px] flex justify-center items-center rounded-full transition-all duration-150 active:scale-95",
                  active ? "bg-mint-green" : "",
                )}
                aria-label={label}
              >
                <IconComponent
                  className={cn(
                    "size-5 transition-all duration-150 text-white",
                  )}
                  strokeWidth={active ? 2.3 : 1.67}
                  size={24}
                />
                {/* <span
                  className={cn(
                    "text-sm leading-none transition-colors duration-150 text-nowrap",
                    active
                      ? "text-[#0A4A41] font-semibold"
                      : "text-subtle font-medium",
                  )}
                >
                  {label}
                </span> */}
              </Link>
            );
          },
        )}
      </div>
    </nav>
  );
}
