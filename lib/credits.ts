// Token economy config — shared by client and server. Pure (no I/O).
//
// Metered LLM work spends "tokens" (friendly units). Each unit is calibrated from
// real Claude token usage: a call's actual usage (input + output, the way Claude
// counts them for claude-sonnet-4-6) is converted to units via UNIT_TOKENS.
// Subscribers get WEEKLY_UNITS free each week (rolling 7-day window, never carries
// over); they can also buy "extra" units that never expire and are consumed only
// after the weekly allowance is exhausted.

export type CreditAction = "search" | "followup" | "generate";

// Client-safe token wallet snapshot (shared by the API, server helpers, and UI).
export interface TokenState {
  weeklyUnits: number;
  weeklyUsed: number;
  weeklyRemaining: number;
  weeklyPct: number; // 0–100, share of the weekly allowance used
  extraPurchased: number;
  extraUsed: number;
  extraBalance: number;
  extraPct: number; // 0–100, share of purchased extra used
  freeGranted: number;
  freeUsed: number;
  freeRemaining: number; // one-time trial units left (spent before weekly/extra)
  totalRemaining: number;
  resetAt: string | null; // ISO; when the weekly bucket next resets
  lastPurchaseAt: string | null;
}

// Free weekly allowance for subscribers (units). Keep in sync with the SQL
// constant in the tokens migration.
export const WEEKLY_UNITS = 50;

// One-time free-trial units granted to a new (never-subscribed) user on their
// first home visit. Now purely cosmetic — drives the FreeTokensModal's "25"
// copy. Real gating is the per-surface free-use model below.
export const FREE_UNITS = 25;

// Free-trial v2: a brand-new (never-subscribed) user gets this many successful
// uses of EACH paywalled surface, tracked independently. Keep in sync with the
// SQL cap in the free_trial_per_surface migration.
export const FREE_USES_PER_SURFACE = 2;

// Paid surfaces gated by the per-surface free-use model (LLM requests only —
// content viewing is auth-gated, not paid). Values are the `surface` keys stored
// in public.free_trial_usage.
export const FREE_SURFACES = {
  personalizedSearch: "personalized_search",
  recipeGenerate: "recipe_generate",
  followupChat: "followup_chat",
} as const;

export type FreeSurface = (typeof FREE_SURFACES)[keyof typeof FREE_SURFACES];

// Claude tokens per 1 unit. Calibrated so a typical action (~1–3k real tokens)
// costs ~1–2 units. Output tokens dominate; MAX_OUTPUT_TOKENS bounds the worst case.
export const UNIT_TOKENS = 1500;

// Show the "almost out" warning once this fraction of the weekly allowance is used.
export const LOW_WARN_PCT = 0.8;

// Fixed unit cost for a generated hero image (Gemini bills per-image, not per text
// token, so it can't share the Claude token divisor).
export const IMAGE_UNITS = 2;

/** Convert real Claude token usage to billable units (min 1 for any real call). */
export function unitsForTokens(claudeTokens: number): number {
  if (!Number.isFinite(claudeTokens) || claudeTokens <= 0) return 1;
  return Math.max(1, Math.ceil(claudeTokens / UNIT_TOKENS));
}

// Output-token ceilings per metered call, so one action maps to a bounded spend.
export const MAX_OUTPUT_TOKENS: Record<CreditAction, number> = {
  search: 1200,
  followup: 1024,
  generate: 2000,
};

export interface CreditBundle {
  id: string;
  credits: number; // units granted to the "extra" bucket
  amount: number; // price in pence (GBP)
  label: string;
  blurb: string;
  mostBought?: boolean;
}

export const BUNDLES: CreditBundle[] = [
  { id: "starter", credits: 50, amount: 199, label: "Starter", blurb: "Can last you a week" },
  {
    id: "popular",
    credits: 150,
    amount: 499,
    label: "Popular",
    blurb: "Can last you a month",
    mostBought: true,
  },
  { id: "value", credits: 350, amount: 999, label: "Value", blurb: "Can last you 3 months" },
  { id: "power", credits: 800, amount: 1999, label: "Power", blurb: "Can last you 6 months" },
];

export function getBundle(id: string): CreditBundle | undefined {
  return BUNDLES.find((b) => b.id === id);
}

/** Format pence as a GBP price, e.g. 499 -> "£4.99". */
export function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}
