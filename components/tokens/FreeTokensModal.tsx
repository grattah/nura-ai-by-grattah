"use client";

import { useEffect, useState } from "react";
import FreeTokens from "@/components/tokens/FreeTokens";
import { createClient } from "@/lib/supabase/client";

// Show the welcome modal once per NEW user. The server flag
// (profiles.has_seen_free_tokens) is the authoritative cross-device guard — the
// home page reads it (non-mutating) to render this modal, and this component
// flips it on mount. A per-user localStorage key dedups RSC-cache remounts on
// this device without blocking other users who sign in here.
const seenKey = (userId: string) => `nuko_free_tokens_seen_${userId}`;

export function FreeTokensModal({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = !!localStorage.getItem(seenKey(userId));
    } catch {}
    if (alreadySeen) return;

    try {
      localStorage.setItem(seenKey(userId), String(Date.now()));
    } catch {}
    setOpen(true);

    // Flip the server flag now that the modal has actually mounted for the user
    // (never during the page render, so prefetch can't consume it).
    createClient()
      .rpc("claim_free_tokens_redirect")
      .then(() => {})
      .then(undefined, () => {});
  }, [userId]);

  if (!open) return null;

  return <FreeTokens onClose={() => setOpen(false)} />;
}
