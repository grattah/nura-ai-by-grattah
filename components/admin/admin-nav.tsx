"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/admin/roles";
import { canManageMembers } from "@/lib/admin/roles";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/recipes", label: "Recipes" },
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

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card min-h-dvh flex flex-col p-4">
      <div className="px-2 py-3">
        <p className="text-lg font-semibold text-foreground">Nuko Admin</p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
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
    </aside>
  );
}
