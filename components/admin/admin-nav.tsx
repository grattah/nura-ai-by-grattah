"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { AdminRole } from "@/lib/admin/roles";
import { canManageMembers } from "@/lib/admin/roles";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/recipes", label: "Recipes" },
  { href: "/admin/tokens", label: "Tokens" },
  { href: "/admin/members", label: "Members", membersOnly: true },
];

export function AdminNav({
  email,
  role,
}: {
  email: string | null;
  role: AdminRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function signOut() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  // Shared nav body — used by both the desktop sidebar and the mobile drawer.
  const NavBody = () => (
    <>
      <div className="px-2 py-3">
        <p className="text-lg font-semibold text-foreground">Nuko Admin</p>
        <p className="text-xs text-muted-foreground break-all">{email}</p>
        <span className="mt-1 inline-block text-[11px] font-medium uppercase tracking-wide text-mint-green">
          {role}
        </span>
      </div>

      <nav className="mt-4 flex flex-col gap-1">
        {LINKS.filter((l) => !l.membersOnly || canManageMembers(role)).map(
          (l) => {
            const active = l.exact
              ? pathname === l.href
              : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-mint-green text-white"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {l.label}
              </Link>
            );
          },
        )}
      </nav>

      <button
        onClick={signOut}
        className="mt-auto rounded-lg px-3 py-2 text-sm font-medium text-left text-destructive hover:bg-muted transition-colors active:scale-95"
      >
        Sign out
      </button>
    </>
  );

  return (
    <>
      {/* Desktop sidebar (≥ md) */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 z-30 w-60 border-r border-border bg-card overflow-y-auto flex-col p-4">
        <NavBody />
      </aside>

      {/* Mobile top bar (< md) */}
      <header className="md:hidden sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 h-14">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="grid place-items-center size-9 -ml-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="size-5 text-foreground" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4 flex flex-col">
            <SheetTitle className="sr-only">Admin navigation</SheetTitle>
            <NavBody />
          </SheetContent>
        </Sheet>
        <p className="text-base font-semibold text-foreground">Nuko Admin</p>
      </header>
    </>
  );
}
