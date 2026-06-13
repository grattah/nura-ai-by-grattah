"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
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
    let active = true;

    async function evaluate(session: Session | null) {
      if (!session) {
        if (active)
          setState({
            hasAccess: false,
            isAuthenticated: false,
            isLoading: false,
          });
        return;
      }

      const { data } = await supabase
        .from("subscriptions")
        .select("status, expires_at")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!active) return;
      const valid =
        !!data && (!data.expires_at || new Date(data.expires_at) > new Date());
      setState({ hasAccess: valid, isAuthenticated: true, isLoading: false });
    }

    // Initial read — a single getSession call.
    supabase.auth.getSession().then(({ data: { session } }) => evaluate(session));

    // Re-check on auth changes using the session the event already provides
    // (no extra getSession). Defer out of the callback so we never call Supabase
    // while it holds its auth lock — doing so can wedge the shared browser
    // client and make every later query hang until a full page reload.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => evaluate(session), 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AccessContext.Provider value={state}>{children}</AccessContext.Provider>
  );
}

export function useAccess() {
  return useContext(AccessContext);
}
