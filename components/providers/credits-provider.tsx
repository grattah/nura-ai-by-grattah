"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { LOW_THRESHOLD } from "@/lib/credits";
import { OutOfCreditsModal } from "@/components/credits/out-of-credits-modal";

interface CreditsState {
  balance: number;
  isLow: boolean;
  hasAccess: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface CreditsContextValue extends CreditsState {
  /** Re-fetch the balance from the server (applies the daily grant). */
  refresh: () => Promise<void>;
  /** Optimistically set the balance (e.g. from a 402 response body). */
  setBalance: (balance: number) => void;
  /** Open the global "out of credits" modal. */
  openBuyModal: () => void;
}

const initialState: CreditsState = {
  balance: 0,
  isLow: false,
  hasAccess: false,
  isAuthenticated: false,
  isLoading: true,
};

const CreditsContext = createContext<CreditsContextValue>({
  ...initialState,
  refresh: async () => {},
  setBalance: () => {},
  openBuyModal: () => {},
});

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CreditsState>(initialState);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/credits", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        authenticated: boolean;
        hasAccess: boolean;
        balance: number;
        isLow: boolean;
      };
      setState({
        balance: data.balance,
        isLow: data.isLow,
        hasAccess: data.hasAccess,
        isAuthenticated: data.authenticated,
        isLoading: false,
      });
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const setBalance = useCallback((balance: number) => {
    setState((s) => ({ ...s, balance, isLow: balance <= LOW_THRESHOLD }));
  }, []);

  const openBuyModal = useCallback(() => setModalOpen(true), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CreditsContext.Provider
      value={{ ...state, refresh, setBalance, openBuyModal }}
    >
      {children}
      <OutOfCreditsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        balance={state.balance}
      />
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}
