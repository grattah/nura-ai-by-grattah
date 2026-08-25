"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LOW_WARN_PCT } from "@/lib/credits";
import { EMPTY_WALLET, type WalletSnapshot } from "@/lib/tokens/spec";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import NoTokens from "@/components/tokens/NoTokens";



interface CreditsState {
  wallet: WalletSnapshot;
  /** This period's grant is ≥ LOW_WARN_PCT spent. */
  isLow: boolean;
  /** The cheapest action is unaffordable. Frozen tokens do not count. */
  isOut: boolean;
  hasAccess: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface CreditsContextValue extends CreditsState {
  /** Re-fetch the wallet from the server. */
  refresh: () => Promise<void>;
  /** Apply a wallet pushed from a 402 response body. */
  applyWallet: (wallet: WalletSnapshot) => void;
  /** Show the full-screen "out of tokens" wall. */
  openTokenWall: () => void;
}

const initialState: CreditsState = {
  wallet: EMPTY_WALLET,
  isLow: false,
  isOut: false,
  hasAccess: false,
  isAuthenticated: false,
  isLoading: true,
};

const CreditsContext = createContext<CreditsContextValue>({
  ...initialState,
  refresh: async () => {},
  applyWallet: () => {},
  openTokenWall: () => {},
});

function deriveFlags(w: WalletSnapshot) {
  return {
    isLow: w.subscriptionPct >= LOW_WARN_PCT * 100,
    // Frozen purchased tokens are retained but unspendable, so "out" is about
    // what can actually be spent, not what is held.
    isOut: !w.canSpend,
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
        isOut: boolean;
        wallet: WalletSnapshot;
      };
      setState({
        wallet: data.wallet,
        ...deriveFlags(data.wallet),
        isOut: data.isOut,
        hasAccess: data.hasAccess,
        isAuthenticated: data.authenticated,
        isLoading: false,
      });
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const applyWallet = useCallback((next: WalletSnapshot) => {
    setState((s) => ({ ...s, wallet: next, ...deriveFlags(next) }));
  }, []);

  const openTokenWall = useCallback(() => setWallOpen(true), []);

  useEffect(() => {
    // Initial load.
    refresh();

    // Re-fetch when the user signs in/out so credits + access don't go stale
    // across account switches within a session (the root provider doesn't
    // remount on client navigation). INITIAL_SESSION is handled by the call
    // above; TOKEN_REFRESHED doesn't change access, so we skip both. Defer out
    // of the callback so we never touch Supabase while it holds its auth lock.
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setTimeout(() => refresh(), 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo(
    () => ({ ...state, refresh, applyWallet, openTokenWall }),
    [state, refresh, applyWallet, openTokenWall],
  );

  return (
    <CreditsContext.Provider value={value}>
      {children}
      <Dialog open={wallOpen} onOpenChange={setWallOpen}>
        <DialogContent
          className="sm:max-w-md p-0 gap-0 overflow-hidden border-0 bg-background"
          showCloseButton
        >
          <DialogTitle className="sr-only">Out of tokens</DialogTitle>
          <div className="pt-10">
            <NoTokens resetAt={state.wallet.nextAllocationAt} />
          </div>
        </DialogContent>
      </Dialog>
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}
