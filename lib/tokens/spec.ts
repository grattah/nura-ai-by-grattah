// Nuko AI Token System — the rules, kept pure so they can be tested without a
// database. Spec dated 21 August 2026.
//
// The central idea is §2: subscription tokens and purchased tokens buy
// different amounts of work, so NOTHING stores or arithmetics on "tokens".
// Every balance, cost, and deduction is an integer number of UNITS; tokens
// exist only at the display layer. That is what keeps a 0.5-token follow-up
// from becoming a rounding bug.

import type { Plan } from "@/constants";

// ── §2 Internal units ───────────────────────────────────────────────────────

/** 1 subscription token buys 2 units of work. */
export const SUBSCRIPTION_UNITS_PER_TOKEN = 2;
/** 1 purchased token buys 1 unit of work. */
export const PURCHASED_UNITS_PER_TOKEN = 1;

export type TokenAction = "followup" | "suggestion" | "generate";

/** §2 — cost of each action, in units. */
export const ACTION_UNITS: Record<TokenAction, number> = {
  followup: 1,
  suggestion: 1,
  generate: 3,
};

/**
 * The published rate cards, derived rather than duplicated.
 *
 * The spec prints both cards (0.5/0.5/1.5 subscription, 1/1/3 purchased) as a
 * cross-check on the unit values. Computing them here means the cards can never
 * drift from the units the code actually spends.
 */
export const subscriptionTokenCost = (action: TokenAction): number =>
  ACTION_UNITS[action] / SUBSCRIPTION_UNITS_PER_TOKEN;

export const purchasedTokenCost = (action: TokenAction): number =>
  ACTION_UNITS[action] / PURCHASED_UNITS_PER_TOKEN;

// ── Display conversion (§2, last line) ──────────────────────────────────────

/** Subscription units → tokens. Halves, so 1 unit displays as 0.5 tokens. */
export const subscriptionUnitsToTokens = (units: number): number =>
  units / SUBSCRIPTION_UNITS_PER_TOKEN;

/** Purchased units → tokens. 1:1. */
export const purchasedUnitsToTokens = (units: number): number => units;

// ── §3 Subscription token allocation ────────────────────────────────────────

export interface PlanGrant {
  /** What the user is told they receive. */
  tokens: number;
  /** What is actually stored. */
  units: number;
  cadence: "weekly" | "monthly";
}

/**
 * §3 — per-plan grant.
 *
 * Yearly is deliberately identical to monthly: the spec is explicit that yearly
 * subscribers are NOT front-loaded with 600 tokens, they receive 50 per month
 * across the year.
 */
export const PLAN_GRANTS: Record<Plan, PlanGrant> = {
  weekly: { tokens: 15, units: 30, cadence: "weekly" },
  monthly: { tokens: 50, units: 100, cadence: "monthly" },
  annual: { tokens: 50, units: 100, cadence: "monthly" },
};

// ── §4 Purchased token packs ────────────────────────────────────────────────

export interface TokenPack {
  id: string;
  /** Price in minor units (USD cents). */
  amount: number;
  tokens: number;
  /** Purchased tokens are 1 unit each, so units === tokens. */
  units: number;
}

/** §4 — larger packs are intentionally better value. */
export const TOKEN_PACKS: TokenPack[] = [
  { id: "pack-10", amount: 99, tokens: 10, units: 10 },
  { id: "pack-45", amount: 399, tokens: 45, units: 45 },
  { id: "pack-85", amount: 699, tokens: 85, units: 85 },
  { id: "pack-130", amount: 999, tokens: 130, units: 130 },
];

export const getPack = (id: string): TokenPack | undefined =>
  TOKEN_PACKS.find((p) => p.id === id);

// ── §5 Spend routing ────────────────────────────────────────────────────────

export interface Balances {
  subscriptionUnits: number;
  purchasedUnits: number;
  /** §7 — purchased units are unspendable while the subscription is lapsed. */
  purchasedFrozen: boolean;
}

export interface SpendPlan {
  ok: boolean;
  costUnits: number;
  fromSubscription: number;
  fromPurchased: number;
  /** Balances as they would be after settling. */
  after: Balances;
  /** Units the user is short by; 0 when ok. */
  shortfall: number;
}

/**
 * §5 — subscription first, then purchased, mixing allowed.
 *
 * Returns a PLAN, not a mutation: §6 requires the cost to be reserved before
 * the work runs and settled or released afterwards, so the caller needs the
 * split up front in order to refund it in the same proportions.
 *
 * Frozen purchased units are treated as unavailable but are never reduced —
 * §7 is explicit that freezing is a flag, not a deletion.
 */
export function planSpend(action: TokenAction, balances: Balances): SpendPlan {
  const costUnits = ACTION_UNITS[action];
  const spendableSubscription = Math.max(0, balances.subscriptionUnits);
  const spendablePurchased = balances.purchasedFrozen
    ? 0
    : Math.max(0, balances.purchasedUnits);

  const fromSubscription = Math.min(costUnits, spendableSubscription);
  const remainder = costUnits - fromSubscription;
  const fromPurchased = Math.min(remainder, spendablePurchased);
  const shortfall = remainder - fromPurchased;

  const ok = shortfall === 0;

  return {
    ok,
    costUnits,
    // A failed plan spends nothing — §5 step 4 blocks the action outright.
    fromSubscription: ok ? fromSubscription : 0,
    fromPurchased: ok ? fromPurchased : 0,
    shortfall,
    after: ok
      ? {
          subscriptionUnits: balances.subscriptionUnits - fromSubscription,
          purchasedUnits: balances.purchasedUnits - fromPurchased,
          purchasedFrozen: balances.purchasedFrozen,
        }
      : balances,
  };
}

/**
 * §6 — release a reservation, returning units to the balances they came from.
 *
 * Takes the original SpendPlan rather than just a total, because the spec
 * requires refunds to land "in the same proportions" — refunding 3 units to
 * whichever balance happens to be low would silently move value between them.
 */
export function releaseReservation(
  plan: Pick<SpendPlan, "fromSubscription" | "fromPurchased">,
  balances: Balances,
): Balances {
  return {
    subscriptionUnits: balances.subscriptionUnits + plan.fromSubscription,
    purchasedUnits: balances.purchasedUnits + plan.fromPurchased,
    purchasedFrozen: balances.purchasedFrozen,
  };
}

// ── §3 Anniversary day ──────────────────────────────────────────────────────

const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/**
 * The allocation date in a given month for a subscriber whose anchor is
 * `anchorDay` (their signup day-of-month, 1–31).
 *
 * Clamps to the last day when the month is short — 31 March becomes 30 April.
 */
export function allocationDateInMonth(
  anchorDay: number,
  year: number,
  monthIndex: number,
): Date {
  const day = Math.min(anchorDay, daysInMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, day));
}

/**
 * §3 — the next monthly allocation strictly after `from`.
 *
 * Always computed from the ORIGINAL anchor day, never from the previous grant
 * date. That is what stops the fallback shifting the anniversary permanently:
 * a 31st subscriber granted on 28 February is still due on 31 March, because
 * the anchor is still 31.
 */
export function nextMonthlyAllocation(anchorDay: number, from: Date): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();

  const thisMonth = allocationDateInMonth(anchorDay, year, month);
  if (thisMonth.getTime() > from.getTime()) return thisMonth;

  return allocationDateInMonth(anchorDay, year, month + 1);
}

/** §3 — weekly grants land seven days after the previous renewal. */
export function nextWeeklyAllocation(previousRenewal: Date): Date {
  return new Date(previousRenewal.getTime() + 7 * 24 * 60 * 60 * 1000);
}

/** The anchor day to store for a subscriber, from their signup date. */
export const anchorDayFrom = (signup: Date): number => signup.getUTCDate();

// ── §3 No rollover ──────────────────────────────────────────────────────────

/**
 * §3 — allocation REPLACES the subscription balance, it does not add to it.
 *
 * Unused subscription units are lost. Returned as a function rather than
 * inlined so the "no rollover" rule is stated in exactly one place; getting
 * this wrong by using `+=` is the difference between a 15-token plan and an
 * accumulating one.
 */
export function allocateSubscription(plan: Plan, balances: Balances): Balances {
  return {
    subscriptionUnits: PLAN_GRANTS[plan].units,
    // §4 — the two balances are independent; allocation never touches purchased.
    purchasedUnits: balances.purchasedUnits,
    purchasedFrozen: balances.purchasedFrozen,
  };
}

// ── §7 Lifecycle ────────────────────────────────────────────────────────────

/**
 * §7 — the subscription has lapsed (cancelled at period end, or a renewal
 * failed and the period ended).
 *
 * Subscription units die; purchased units are FROZEN, never destroyed. The
 * spec's rationale is that purchased tokens are money already paid, so
 * destroying them invites chargebacks.
 */
export function lapse(balances: Balances): Balances {
  return {
    subscriptionUnits: 0,
    purchasedUnits: balances.purchasedUnits,
    purchasedFrozen: true,
  };
}

/** §7 — resubscribed or payment resolved: purchased units unfreeze at their previous value. */
export function unfreeze(balances: Balances): Balances {
  return { ...balances, purchasedFrozen: false };
}

/**
 * §7 Plan changes — an upgrade takes effect immediately.
 *
 * The balance RESETS to the new plan's grant (it does not top up), the
 * anniversary moves to the upgrade date, and purchased units are untouched.
 */
export function upgrade(
  toPlan: Plan,
  at: Date,
  balances: Balances,
): { balances: Balances; anchorDay: number } {
  return {
    balances: {
      subscriptionUnits: PLAN_GRANTS[toPlan].units,
      purchasedUnits: balances.purchasedUnits,
      purchasedFrozen: balances.purchasedFrozen,
    },
    anchorDay: anchorDayFrom(at),
  };
}

// ── Display ─────────────────────────────────────────────────────────────────

export interface WalletView {
  subscriptionTokens: number;
  purchasedTokens: number;
  purchasedFrozen: boolean;
  /** Whether the cheapest action (1 unit) can currently be afforded. */
  canSpend: boolean;
}

export function walletView(balances: Balances): WalletView {
  return {
    subscriptionTokens: subscriptionUnitsToTokens(balances.subscriptionUnits),
    purchasedTokens: purchasedUnitsToTokens(balances.purchasedUnits),
    purchasedFrozen: balances.purchasedFrozen,
    canSpend: planSpend("followup", balances).ok,
  };
}

/**
 * Everything the wallet UI needs, in one client-safe shape.
 *
 * Replaces the old TokenState, which was built around a rolling weekly window
 * (weeklyPct / resetAt / extraBalance) that the new model does not have: the
 * subscription balance is granted per period and dies at period end, and
 * purchased tokens are frozen rather than consumed after the weekly bucket.
 */
export interface WalletSnapshot extends WalletView {
  /** The plan's full grant, so the UI can show a used-vs-granted bar. */
  grantTokens: number;
  /** 0-100, share of this period's grant already spent. */
  subscriptionPct: number;
  /** When the next grant lands (ISO), or null if not subscribed. */
  nextAllocationAt: string | null;
  lastPurchaseAt: string | null;
  plan: Plan | null;
  /** Total spendable units — 0 when nothing can be afforded. */
  spendableUnits: number;
}

export function walletSnapshot(input: {
  balances: Balances;
  plan: Plan | null;
  nextAllocationAt?: string | null;
  lastPurchaseAt?: string | null;
}): WalletSnapshot {
  const { balances, plan } = input;
  const grantUnits = plan ? PLAN_GRANTS[plan].units : 0;
  const grantTokens = plan ? PLAN_GRANTS[plan].tokens : 0;

  const usedUnits = Math.max(0, grantUnits - balances.subscriptionUnits);
  const subscriptionPct =
    grantUnits > 0 ? Math.min(100, Math.round((usedUnits / grantUnits) * 100)) : 0;

  return {
    ...walletView(balances),
    grantTokens,
    subscriptionPct,
    nextAllocationAt: input.nextAllocationAt ?? null,
    lastPurchaseAt: input.lastPurchaseAt ?? null,
    plan,
    spendableUnits:
      balances.subscriptionUnits +
      (balances.purchasedFrozen ? 0 : balances.purchasedUnits),
  };
}

/** A wallet for someone with no subscription and nothing purchased. */
export const EMPTY_WALLET: WalletSnapshot = walletSnapshot({
  balances: { subscriptionUnits: 0, purchasedUnits: 0, purchasedFrozen: false },
  plan: null,
});
