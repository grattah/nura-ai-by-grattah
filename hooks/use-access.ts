"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAccess() {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_BYPASS_PAYWALL === "true") {
      setHasAccess(true);
      setIsLoading(false);
      return;
    }
    const supabase = createClient();

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("subscriptions")
        .select("status, expires_at")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .maybeSingle();

      const valid =
        !!data && (!data.expires_at || new Date(data.expires_at) > new Date());
      setHasAccess(valid);
      setIsLoading(false);
    }

    check();
    // Re-check when auth state changes (sign in/out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => check());
    return () => subscription.unsubscribe();
  }, []);

  return { hasAccess, isLoading };
}
