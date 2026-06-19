"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { WEEKLY_UNITS, LOW_WARN_PCT, type TokenState } from "@/lib/credits";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import NoTokens from "@/components/tokens/NoTokens";

const EMPTY_STATE: TokenState = {
  weeklyUnits: WEEKLY_UNITS,
  weeklyUsed: 0,
  weeklyRemaining: WEEKLY_UNITS,
  weeklyPct: 0,
  extraPurchased: 0,
  extraUsed: 0,
  extraBalance: 0,
  extraPct: 0,
  totalRemaining: 0,
  resetAt: null,
  lastPurchaseAt: null,
};

interface CreditsState {
  state: TokenState;
  isLow: boolean; // weekly allowance ≥ LOW_WARN_PCT used
  isOut: boolean; // no weekly nor extra units left
  hasAccess: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface CreditsContextValue extends CreditsState {
  /** Re-fetch token state from the server (applies the rolling weekly reset). */
  refresh: () => Promise<void>;
  /** Apply a state pushed from a 402 response body. */
  applyState: (state: TokenState) => void;
  /** Show the full-screen "out of tokens" wall. */
  openTokenWall: () => void;
}

const initialState: CreditsState = {
  state: EMPTY_STATE,
  isLow: false,
  isOut: false,
  hasAccess: false,
  isAuthenticated: false,
  isLoading: true,
};

const CreditsContext = createContext<CreditsContextValue>({
  ...initialState,
  refresh: async () => {},
  applyState: () => {},
  openTokenWall: () => {},
});

function deriveFlags(s: TokenState) {
  return {
    isLow: s.weeklyPct >= LOW_WARN_PCT * 100,
    isOut: s.totalRemaining <= 0,
  };
}

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CreditsState>(initialState);
  const [wallOpen, setWallOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/credits", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        authenticated: boolean;
        hasAccess: boolean;
        isLow: boolean;
        isOut: boolean;
        state: TokenState;
      };
      setState({
        state: data.state,
        isLow: data.isLow,
        isOut: data.isOut,
        hasAccess: data.hasAccess,
        isAuthenticated: data.authenticated,
        isLoading: false,
      });
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const applyState = useCallback((next: TokenState) => {
    setState((s) => ({ ...s, state: next, ...deriveFlags(next) }));
  }, []);

  const openTokenWall = useCallback(() => setWallOpen(true), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CreditsContext.Provider
      value={{ ...state, refresh, applyState, openTokenWall }}
    >
      {children}
      <Dialog open={wallOpen} onOpenChange={setWallOpen}>
        <DialogContent
          className="sm:max-w-md p-0 gap-0 overflow-hidden border-0 bg-background"
          showCloseButton
        >
          <DialogTitle className="sr-only">Out of tokens</DialogTitle>
          <div className="pt-10">
            <NoTokens resetAt={state.state.resetAt} />
          </div>
        </DialogContent>
      </Dialog>
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}
