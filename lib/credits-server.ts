import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  unitsForTokens,
  WEEKLY_UNITS,
  LOW_WARN_PCT,
  type TokenState,
} from "@/lib/credits";
import {
  recordUsage,
  type UsageProvider,
  type UsageSource,
} from "@/lib/usage-server";

// Provider/model context for the token-usage ledger. Billed call sites pass this
// so every metered spend is also logged to token_usage (best-effort).
export interface MeterMeta {
  provider: UsageProvider;
  model: string;
  source?: UsageSource;
  images?: number;
  inputTokens?: number;
  outputTokens?: number;
  // Usage-ledger surface, when it should differ from the billing `label`
  // (e.g. recipe generation bills under the recipe name but logs "recipe-generate").
  surface?: string;
}

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
  freeGranted: number;
  freeUsed: number;
  freeRemaining: number;
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
    freeGranted: 0,
    freeUsed: 0,
    freeRemaining: 0,
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
  meta?: MeterMeta,
): Promise<TokenState> {
  const admin = createServiceRoleClient();
  const { data } = await admin.rpc("spend_tokens" as never, {
    p_user: userId,
    p_units: units,
    p_reason: "spend",
    p_label: label,
    p_raw_tokens: rawTokens ?? null,
  } as never);
  // Also log to the observability ledger (best-effort; never blocks).
  if (meta) {
    void recordUsage({
      provider: meta.provider,
      model: meta.model,
      surface: meta.surface ?? label,
      source: meta.source ?? "runtime",
      userId,
      inputTokens: meta.inputTokens,
      outputTokens: meta.outputTokens,
      totalTokens: rawTokens,
      images: meta.images,
      units,
      billed: true,
    });
  }
  return toState(data as RawState | null);
}

/** Spend the units that `claudeTokens` of real usage maps to. */
export async function meter(
  userId: string,
  claudeTokens: number,
  label: string,
  meta?: MeterMeta,
): Promise<TokenState> {
  return meterUnits(
    userId,
    unitsForTokens(claudeTokens),
    label,
    claudeTokens,
    meta,
  );
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
