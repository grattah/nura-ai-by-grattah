"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AccessState {
  hasAccess: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Whether the user has ever had a subscription (any status) — drives the
   * paywall "free trial ended" copy and the personalized-search lock overlay. */
  hasEverSubscribed: boolean;
}

const initialState: AccessState = {
  hasAccess: false,
  isAuthenticated: false,
  isLoading: true,
  hasEverSubscribed: false,
};

const AccessContext = createContext<AccessState>(initialState);

interface AccessProviderProps {
  children: React.ReactNode;
  /**
   * Authoritative state computed server-side (see `getCachedAccess`). The server
   * is the source of truth: because sign-out/sign-in run as server actions that
   * `revalidatePath`, these props re-render and the effect below re-syncs state
   * instantly — no page reload needed.
   */
  serverHasAccess: boolean;
  serverIsAuthenticated: boolean;
  serverHasEverSubscribed: boolean;
}

export function AccessProvider({
  children,
  serverHasAccess,
  serverIsAuthenticated,
  serverHasEverSubscribed,
}: AccessProviderProps) {
  const [state, setState] = useState<AccessState>({
    hasAccess: serverHasAccess,
    isAuthenticated: serverIsAuthenticated,
    isLoading: false,
    hasEverSubscribed: serverHasEverSubscribed,
  });

  // Server props are authoritative. Re-sync whenever they change — this is the
  // channel that delivers server-action sign-out/sign-in to every consumer.
  useEffect(() => {
    setState({
      hasAccess: serverHasAccess,
      isAuthenticated: serverIsAuthenticated,
      isLoading: false,
      hasEverSubscribed: serverHasEverSubscribed,
    });
  }, [serverHasAccess, serverIsAuthenticated, serverHasEverSubscribed]);

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
            hasEverSubscribed: false,
          });
        return;
      }

      // Access is subscription OR free-trial units, and we also need the
      // ever-subscribed flag — /api/credits computes both server-side, so read
      // it rather than checking the subscription alone. Seed from the
      // authoritative server props so a failed/lagging read never DOWNGRADES a
      // genuinely-entitled user to "no access" (only a successful read moves it).
      let hasAccess = serverHasAccess;
      let everSubscribed = serverHasEverSubscribed;
      try {
        const res = await fetch("/api/credits", { cache: "no-store" });
        if (res.ok) {
          const body = await res.json();
          hasAccess = !!body.hasAccess;
          if (typeof body.hasEverSubscribed === "boolean")
            everSubscribed = body.hasEverSubscribed;
        }
      } catch {
        // Network hiccup — keep the server-seeded access rather than forcing false.
      }

      if (!active) return;
      setState({
        hasAccess,
        isAuthenticated: true,
        isLoading: false,
        hasEverSubscribed: everSubscribed,
      });
    }

    // Catch client-driven auth changes using the session the event already provides
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
