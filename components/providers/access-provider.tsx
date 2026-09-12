"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

interface AccessState {
  hasAccess: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasEverSubscribed: boolean;
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

  const identifiedUserIdRef = useRef<string | null>(null);

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

      let authenticated = true;
      let hasAccess = serverHasAccess;
      let everSubscribed = serverHasEverSubscribed;
      let subscriber = serverIsSubscriber;
      try {
        const res = await fetch("/api/credits", { cache: "no-store" });
        if (res.ok) {
          const body = await res.json();
          if (typeof body.authenticated === "boolean")
            authenticated = body.authenticated;
          hasAccess = authenticated && !!body.hasAccess;
          if (typeof body.hasEverSubscribed === "boolean")
            everSubscribed = body.hasEverSubscribed;
          if (typeof body.isSubscriber === "boolean")
            subscriber = body.isSubscriber;
        }
      } catch {}

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

      if (identifiedUserIdRef.current !== session.user.id) {
        identifiedUserIdRef.current = session.user.id;
        posthog.identify(session.user.id, { email: session.user.email });
        posthog.capture(ANALYTICS_EVENTS.APP_ENTERED);
      }

      setState({
        hasAccess,
        isAuthenticated: true,
        isLoading: false,
        hasEverSubscribed: everSubscribed,
        isSubscriber: subscriber,
      });
    }

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
