"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { MenuPanel } from "./menu-overlay";

interface AppHeaderUser {
  name: string;
  email?: string;
  avatar: string;
  avatarLetter: string;
  isSubscriber?: boolean;
}

interface AppHeaderProps {
  user: AppHeaderUser | null;
}

export function AppHeader({ user }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const openMenu = () => {
    setMounted(true);
    setOpen(true);
  };
  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 px-6 py-2">
      <div className="flex items-center justify-between h-10">
        <Link
          href={user ? "/" : "/landing"}
          className="flex items-center gap-2 py-1 px-3 rounded-full liquid-glass"
        >
          <Image src="/icon.svg" alt="Nuko Logo" width={20} height={20} />
          <span className="text-xl font-semibold text-[#50443B] tracking-tight leading-[32px]">
            Nuko
          </span>
        </Link>

        <button
          onClick={open ? closeMenu : openMenu}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="size-10 rounded-full flex items-center justify-center liquid-glass"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {mounted  && (
        <MenuPanel user={user}
        open={open}
        onRequestClose={closeMenu}
        onClosed={() => setMounted(false)} />
      )}
    </header>
  );
}