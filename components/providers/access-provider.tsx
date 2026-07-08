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
  /** Active, unexpired subscription — unlimited access. Distinguishes a paying
   * user (no per-surface caps) from a new user in the free trial. */
  isSubscriber: boolean;
}

const initialState: AccessState = {
  hasAccess: false,
  isAuthenticated: false,
  isLoading: true,
  hasEverSubscribed: false,
  isSubscriber: false,
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
  serverIsSubscriber: boolean;
}

export function AccessProvider({
  children,
  serverHasAccess,
  serverIsAuthenticated,
  serverHasEverSubscribed,
  serverIsSubscriber,
}: AccessProviderProps) {
  const [state, setState] = useState<AccessState>({
    hasAccess: serverHasAccess,
    isAuthenticated: serverIsAuthenticated,
    isLoading: false,
    hasEverSubscribed: serverHasEverSubscribed,
    isSubscriber: serverIsSubscriber,
  });

  // Server props are authoritative. Re-sync whenever they change — this is the
  // channel that delivers server-action sign-out/sign-in to every consumer.
  useEffect(() => {
    setState({
      hasAccess: serverHasAccess,
      isAuthenticated: serverIsAuthenticated,
      isLoading: false,
      hasEverSubscribed: serverHasEverSubscribed,
      isSubscriber: serverIsSubscriber,
    });
  }, [
    serverHasAccess,
    serverIsAuthenticated,
    serverHasEverSubscribed,
    serverIsSubscriber,
  ]);

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
            isSubscriber: false,
          });
        return;
      }

      // Global access = active subscriber OR new user in trial. We also need the
      // ever-subscribed + subscriber flags — /api/credits computes them
      // server-side, so read it rather than checking the subscription alone. Seed
      // from the authoritative server props so a failed/lagging read never
      // DOWNGRADES a genuinely-entitled user (only a successful read moves it).
      let authenticated = true;
      let hasAccess = serverHasAccess;
      let everSubscribed = serverHasEverSubscribed;
      let subscriber = serverIsSubscriber;
      try {
        const res = await fetch("/api/credits", { cache: "no-store" });
        if (res.ok) {
          const body = await res.json();
          // Trust the SERVER's view of auth: a stale client session must not keep
          // the user "authenticated" after their cookie was cleared (e.g. logout).
          if (typeof body.authenticated === "boolean")
            authenticated = body.authenticated;
          hasAccess = authenticated && !!body.hasAccess;
          if (typeof body.hasEverSubscribed === "boolean")
            everSubscribed = body.hasEverSubscribed;
          if (typeof body.isSubscriber === "boolean")
            subscriber = body.isSubscriber;
        }
      } catch {
        // Network hiccup — keep the server-seeded access rather than forcing false.
      }

      if (!active) return;
      if (!authenticated) {
        setState({
          hasAccess: false,
          isAuthenticated: false,
          isLoading: false,
          hasEverSubscribed: false,
          isSubscriber: false,
        });
        return;
      }
      setState({
        hasAccess,
        isAuthenticated: true,
        isLoading: false,
        hasEverSubscribed: everSubscribed,
        isSubscriber: subscriber,
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
