"use client";

import { useEffect, useState } from "react";
import FreeTokens from "@/components/tokens/FreeTokens";

// Show the welcome modal at most once per device, ever. The server flag
// (has_seen_free_tokens via claim_free_tokens_redirect) is the cross-device
// guard, but the home RSC is replayed from the App Router cache on back-nav,
// which would remount this modal open — so persist a local "seen" flag too.
const SEEN_KEY = "nuko_free_tokens_seen";

export function FreeTokensModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        localStorage.setItem(SEEN_KEY, String(Date.now()));
        setOpen(true);
      }
    } catch {
      // localStorage unavailable — fall back to showing once this mount.
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  return <FreeTokens onClose={() => setOpen(false)} />;
}
