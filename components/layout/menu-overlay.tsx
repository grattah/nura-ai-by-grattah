"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ActiveHomeIcon } from "@/components/vectors/menu/Home";
import { SearchIcon, ActiveSearchIcon } from "@/components/vectors/menu/Search";
import {
  BookmarkIcon,
  ActiveBookmarkIcon,
} from "@/components/vectors/menu/Bookmark";
import {
  ActivitiesIcon,
  ActiveActivitiesIcon,
} from "../vectors/menu/Activities";
import { LoginIcon, ActiveLoginIcon } from "../vectors/menu/Login";
import { FaCrown } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import { lockAppScroll } from "@/lib/scroll-lock";
import Image from "next/image";

const PANEL_MS = 150;

interface MenuUser {
  name: string;
  email?: string;
  avatar: string;
  avatarLetter: string;
  isSubscriber?: boolean;
}

const AUTHED_LINKS = [
  { href: "/", label: "Home", icon: HomeIcon, activeIcon: ActiveHomeIcon },
  {
    href: "/find-recipe",
    label: "Find recipe",
    icon: SearchIcon,
    activeIcon: ActiveSearchIcon,
  },
  {
    href: "/community",
    label: "Activities",
    icon: ActivitiesIcon,
    activeIcon: ActiveActivitiesIcon,
  },
  {
    href: "/bookmarks",
    label: "Saved",
    icon: BookmarkIcon,
    activeIcon: ActiveBookmarkIcon,
  },
];

const GUEST_LINKS = [
  {
    href: "/landing#features",
    label: "Features",
    icon: ActivitiesIcon,
    activeIcon: ActiveActivitiesIcon,
  },
  {
    href: "/auth/login?landing=true",
    label: "Log in",
    icon: LoginIcon,
    activeIcon: ActiveLoginIcon,
  },
];

export function MenuPanel({
  user,
  open,
  onRequestClose,
  onClosed,
}: {
  user: MenuUser | null;
  open: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
}) {
  const pathName = usePathname();
  const [show, setShow] = useState(false);
  const closeTimer = useRef<number | null>(null);

  // Drive the transform off the `open` prop.
  useEffect(() => {
    if (open) {
      // Enter: paint at -translate-y-full first, then flip to 0.
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setShow(true))
      );
      return () => cancelAnimationFrame(id);
    } else {
      // Exit: slide up, then unmount via onClosed after the transition.
      setShow(false);
      closeTimer.current = window.setTimeout(onClosed, PANEL_MS);
      return () => {
        if (closeTimer.current) window.clearTimeout(closeTimer.current);
      };
    }
  }, [open, onClosed]);

  // Escape asks the parent to close (flip `open`); the effect above animates.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose(); // see note below on Escape
    };
    document.addEventListener("keydown", onKey);
    const unlock = lockAppScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlock();
    };
  }, [onRequestClose]);

  const links = user ? AUTHED_LINKS : GUEST_LINKS;

  return (
    // top-14 ≈ header height (adjust if your header is taller/shorter)
    <div
      className={cn(
        "fixed inset-x-0 top-14 bottom-0 z-40 bg-[#EBE8DA] flex flex-col",
        "transition-transform duration-300 ease-out",
        show ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <nav className="flex-1 px-6 pt-6 flex flex-col gap-4 overflow-y-auto">
        {links.map(({ href, label, icon: Icon, activeIcon: ActiveIcon }) => {
          const isActive =
            href === "/" ? pathName === "/" : pathName.startsWith(href);
          return (
            <Link
              key={href}
              href={href === "/auth/login?landing=true" && !pathName.includes("landing") ? "/auth/login" : href}
              onClick={onRequestClose}
              className="flex items-center gap-3 py-3"
            >
              <span
                className={cn(
                  "size-12 rounded-full flex items-center justify-center transition-colors",
                  isActive ? "bg-[#155151]" : "bg-[#D3D1C4]"
                )}
              >
                {isActive ? <ActiveIcon /> : <Icon />}
              </span>
              <span
                className={cn(
                  "text-base",
                  isActive
                    ? "text-[#0A4A41] font-semibold"
                    : "text-subtle font-medium"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="px-6 pb-8 shrink-0">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {user.isSubscriber && (
                  <FaCrown
                    size={12}
                    color="#227B6F"
                    className="absolute right-3.25 -top-2.25"
                  />
                )}
                <div
                  className={`size-11 rounded-full bg-mint-green text-white flex items-center justify-center font-semibold ${
                    user.isSubscriber ? "border-2 border-mint-green" : ""
                  }`}
                >
                  {user.avatar.length > 0 ? (
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={44}
                      height={44}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <p>{user.avatarLetter}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col">
                <p className="text-base font-medium text-base-text">
                  {user.name}
                </p>
                {user.isSubscriber && (
                  <p className="text-sm text-subtle font-medium">On Nuko+</p>
                )}
              </div>
            </div>
            <Link
              href="/account"
              onClick={onRequestClose}
              className="text-mint-green font-semibold text-base"
            >
              View profile
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
