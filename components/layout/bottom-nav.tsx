"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommunityIcon } from "@/components/vectors/navbar-icons/community-icon";
import { SearchIcon } from "@/components/vectors/navbar-icons/search-icon";
import { HomeIcon } from "@/components/vectors/navbar-icons/home-icon";
import { BookmarkIcon } from "@/components/vectors/navbar-icons/bookmark-icon";
import { cn } from "@/lib/utils";
import { file } from "zod/v4";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: HomeIcon },
  {
    label: "Find recipe",
    href: "/find-recipe",
    icon: SearchIcon,
  },
  {
    label: "Activities",
    href: "/community",
    icon: CommunityIcon,
  },
  {
    label: "Saved",
    href: "/bookmarks",
    icon: BookmarkIcon,
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-2 mx-auto inset-x-0 w-fit z-40">
      <div className="mx-0 flex items-center p-1 rounded-full overflow-hidden liquid-glass border-2 w-fit">
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "w-[clamp(70.8px,20.58vw,88.5px)] h-14 flex justify-center items-center rounded-full transition-all duration-150 active:scale-95",
                active ? "bg-mint-green text-white" : "text-[#DBDBDB]",
              )}
              aria-label={label}
            >
              {icon({
                className: `size-7 transition-all duration-150`,
              })}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}