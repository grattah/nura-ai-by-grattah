"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface AccessState {
  hasAccess: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AccessState = {
  hasAccess: false,
  isAuthenticated: false,
  isLoading: true,
};

const AccessContext = createContext<AccessState>(initialState);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccessState>(initialState);

  useEffect(() => {
    const supabase = createClient();

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setState({ hasAccess: false, isAuthenticated: false, isLoading: false });
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
      setState({ hasAccess: valid, isAuthenticated: true, isLoading: false });
    }

    check();
    // Re-check when auth state changes (sign in/out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => check());
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AccessContext.Provider value={state}>{children}</AccessContext.Provider>
  );
}

export function useAccess() {
  return useContext(AccessContext);
}
