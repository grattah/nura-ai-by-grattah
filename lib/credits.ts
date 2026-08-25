import { TOKEN_PACKS } from "@/lib/tokens/spec";

// Token economy config — shared by client and server. Pure (no I/O).
//
// Free-trial config and the purchased-pack catalogue. The token economy itself
// (units, action costs, grants, spend routing) lives in lib/tokens/spec.ts.

export type CreditAction = "search" | "followup" | "generate";

const PACK_BLURBS: Record<string, string> = {
  "pack-10": "A quick top-up",
  "pack-45": "Most popular",
  "pack-85": "Better value",
  "pack-130": "Best value",
};

// The wallet shape now lives in lib/tokens/spec.ts (WalletSnapshot). The old
// TokenState modelled a rolling weekly window and an "extra" bucket, neither of
// which exists under the 21 Aug 2026 spec.

export const FREE_UNITS = 25;

// Free-trial v2: a brand-new (never-subscribed) user gets this many successful
// uses of EACH paywalled surface, tracked independently. Keep in sync with the
// SQL cap in the free_trial_per_surface migration.
export const FREE_USES_PER_SURFACE = 2;

// Paid surfaces gated by the per-surface free-use model (LLM requests only —
// content viewing is auth-gated, not paid). Values are the `surface` keys stored
// in public.free_trial_usage.
export const FREE_SURFACES = {
  // personalizedSearch: "personalized_search", // feature currently unavailable — excluded from the free-trial pool
  recipeGenerate: "recipe_generate",
  followupChat: "followup_chat",
  recipeSuggestions: "recipe_suggestions",
} as const;

// Kept as a standalone literal (rather than in FREE_SURFACES above) so
// lib/personalized-search-server.ts and its page/route still compile while the
// feature is unavailable. Move it back into FREE_SURFACES to resume counting
// it toward the free trial.
export const PERSONALIZED_SEARCH_SURFACE = "personalized_search" as const;

export type FreeSurface =
  | (typeof FREE_SURFACES)[keyof typeof FREE_SURFACES]
  | typeof PERSONALIZED_SEARCH_SURFACE;

/** Total free trials a new user gets across all paywalled surfaces (3 × 2 = 6). */
export const FREE_TRIALS_TOTAL =
  Object.keys(FREE_SURFACES).length * FREE_USES_PER_SURFACE;

export interface FreeTrialTokens {
  /** Trials consumed, capped per surface. */
  used: number;
  /** Trials available in total. */
  total: number;
  remaining: number;
  /** `remaining` projected onto the familiar 25-token scale, for display. */
  tokensLeft: number;
  exhausted: boolean;
}

/**
 * Present the per-surface free-trial allowance as a token count.
 *
 * The 25-unit wallet was retired (see FREE_UNITS) — gating is now N uses of each
 * surface. Users still think in "free tokens", so scale the remaining trials
 * onto that scale: 4 of 6 trials left → 4/6 × 25 = 16.67 → **17 tokens**.
 * Rounded UP so a user with any trial left never sees "0 tokens".
 *
 * Pure: takes the per-surface counts so it can be tested without the DB.
 */
export function freeTrialTokens(usedPerSurface: number[]): FreeTrialTokens {
  const total = FREE_TRIALS_TOTAL;
  // Cap each surface — a surface can't consume another's allowance.
  const used = usedPerSurface.reduce(
    (sum, n) => sum + Math.min(Math.max(n, 0), FREE_USES_PER_SURFACE),
    0,
  );
  const remaining = Math.max(0, total - used);
  return {
    used,
    total,
    remaining,
    tokensLeft: total > 0 ? Math.ceil((remaining / total) * FREE_UNITS) : 0,
    exhausted: remaining <= 0,
  };
}

// Claude tokens per 1 unit. Calibrated so a typical action (~1–3k real tokens)
// costs ~1–2 units. Output tokens dominate; MAX_OUTPUT_TOKENS bounds the worst case.

// Show the "almost out" warning once this fraction of the weekly allowance is used.
export const LOW_WARN_PCT = 0.8;

// Fixed unit cost for a generated hero image (Gemini bills per-image, not per text
// token, so it can't share the Claude token divisor).

/** Convert real Claude token usage to billable units (min 1 for any real call). */

// Output-token ceilings per metered call, so one action maps to a bounded spend.
export const MAX_OUTPUT_TOKENS: Record<CreditAction, number> = {
  search: 1200,
  followup: 1024,
  generate: 2000,
};

export interface CreditBundle {
  id: string;
  credits: number; // units granted to the "extra" bucket
  amount: number; // price in minor units (USD cents)
  label: string;
  blurb: string;
  mostBought?: boolean;
}

/**
 * Token packs (spec §4). Purchased tokens are 1 unit each, so `credits`
 * (units granted) equals the token count.
 *
 * Re-exported from lib/tokens/spec.ts rather than duplicated — the checkout
 * charges from `amount` and the webhook credits from `credits`, and those two
 * disagreeing would either overcharge or over-credit.
 */
export const BUNDLES: CreditBundle[] = TOKEN_PACKS.map((p) => ({
  id: p.id,
  credits: p.units,
  amount: p.amount,
  label: `${p.tokens} tokens`,
  blurb: PACK_BLURBS[p.id] ?? "",
  mostBought: p.id === "pack-45",
}));

export function getBundle(id: string): CreditBundle | undefined {
  return BUNDLES.find((b) => b.id === id);
}

/** Format minor units as a USD price, e.g. 499 -> "$4.99". */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
