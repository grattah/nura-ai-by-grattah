"use client";

import { useEffect, useState } from "react";
import FreeTokens from "@/components/tokens/FreeTokens";
import { createClient } from "@/lib/supabase/client";

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

    createClient()
      .rpc("claim_free_tokens_redirect")
      .then(() => {})
      .then(undefined, () => {});
  }, [userId]);

  if (!open) return null;

  return <FreeTokens onClose={() => setOpen(false)} />;
}
