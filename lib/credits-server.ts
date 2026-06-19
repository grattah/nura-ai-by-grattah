import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  unitsForTokens,
  WEEKLY_UNITS,
  LOW_WARN_PCT,
  type TokenState,
} from "@/lib/credits";

// Server-side token operations via the SECURITY DEFINER RPCs. Callers must have
// already verified auth + active subscription; pass the authenticated user's id.

export type { TokenState };

// Raw jsonb shape returned by the RPCs (from token_state_json).
interface RawState {
  weeklyUnits: number;
  weeklyUsed: number;
  weeklyRemaining: number;
  extraPurchased: number;
  extraUsed: number;
  extraBalance: number;
  totalRemaining: number;
  resetAt: string | null;
  lastPurchaseAt: string | null;
}

function toState(raw: RawState | null): TokenState {
  const r: RawState = raw ?? {
    weeklyUnits: WEEKLY_UNITS,
    weeklyUsed: 0,
    weeklyRemaining: WEEKLY_UNITS,
    extraPurchased: 0,
    extraUsed: 0,
    extraBalance: 0,
    totalRemaining: WEEKLY_UNITS,
    resetAt: null,
    lastPurchaseAt: null,
  };
  const weeklyPct =
    r.weeklyUnits > 0
      ? Math.min(100, Math.round((r.weeklyUsed / r.weeklyUnits) * 100))
      : 0;
  const extraPct =
    r.extraPurchased > 0
      ? Math.min(100, Math.round((r.extraUsed / r.extraPurchased) * 100))
      : 0;
  return { ...r, weeklyPct, extraPct };
}

/** Current token state (applies the rolling weekly reset). */
export async function getTokenState(userId: string): Promise<TokenState> {
  const admin = createServiceRoleClient();
  const { data } = await admin.rpc("get_token_state" as never, {
    p_user: userId,
  } as never);
  return toState(data as RawState | null);
}

/** Spend a fixed number of units (weekly bucket first, then extra). */
export async function meterUnits(
  userId: string,
  units: number,
  label: string,
  rawTokens?: number,
): Promise<TokenState> {
  const admin = createServiceRoleClient();
  const { data } = await admin.rpc("spend_tokens" as never, {
    p_user: userId,
    p_units: units,
    p_reason: "spend",
    p_label: label,
    p_raw_tokens: rawTokens ?? null,
  } as never);
  return toState(data as RawState | null);
}

/** Spend the units that `claudeTokens` of real usage maps to. */
export async function meter(
  userId: string,
  claudeTokens: number,
  label: string,
): Promise<TokenState> {
  return meterUnits(userId, unitsForTokens(claudeTokens), label, claudeTokens);
}

/** Add purchased "extra" units (Stripe webhook). */
export async function purchase(
  userId: string,
  units: number,
  label: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  await admin.rpc("purchase_tokens" as never, {
    p_user: userId,
    p_units: units,
    p_reason: "purchase",
    p_label: label,
  } as never);
}

/** True once the weekly allowance is ≥ LOW_WARN_PCT used. */
export function isLowState(s: TokenState): boolean {
  return s.weeklyPct >= LOW_WARN_PCT * 100;
}
