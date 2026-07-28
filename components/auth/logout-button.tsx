"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LogoutIcon from "@/components/vectors/logout";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    if (pending) return;
    setPending(true);
    try {
      await createClient().auth.signOut();
    } catch {
      // ignore — proceed to navigate regardless
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="w-full flex items-center justify-between px-4 py-4 min-h-14 bg-card rounded-2xl hover:opacity-80 transition-opacity active:scale-[0.98] text-left disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-[#F3F1E8] flex items-center justify-center shrink-0">
          <LogoutIcon className="size-5 text-error-c700" strokeWidth={2} />
        </div>
        <span className="text-base font-medium text-error-c500">
          {pending ? "Logging out..." : "Log out"}
        </span>
      </div>
    </button>
  );
}
