import type { Plan } from "@/constants";

export const SUBSCRIPTION_UNITS_PER_TOKEN = 2;
export const PURCHASED_UNITS_PER_TOKEN = 1;

export type TokenAction = "followup" | "suggestion" | "generate";

export const ACTION_UNITS: Record<TokenAction, number> = {
  followup: 1,
  suggestion: 1,
  generate: 3,
};

export const subscriptionTokenCost = (action: TokenAction): number =>
  ACTION_UNITS[action] / SUBSCRIPTION_UNITS_PER_TOKEN;

export const purchasedTokenCost = (action: TokenAction): number =>
  ACTION_UNITS[action] / PURCHASED_UNITS_PER_TOKEN;

export const subscriptionUnitsToTokens = (units: number): number =>
  units / SUBSCRIPTION_UNITS_PER_TOKEN;

export const purchasedUnitsToTokens = (units: number): number => units;

export interface PlanGrant {
  tokens: number;
  units: number;
  cadence: "weekly" | "monthly";
}

export const PLAN_GRANTS: Record<Plan, PlanGrant> = {
  weekly: { tokens: 15, units: 30, cadence: "weekly" },
  monthly: { tokens: 50, units: 100, cadence: "monthly" },
  annual: { tokens: 50, units: 100, cadence: "monthly" },
};

export interface TokenPack {
  id: string;
  amount: number;
  tokens: number;
  units: number;
}

export const TOKEN_PACKS: TokenPack[] = [
  { id: "pack-10", amount: 99, tokens: 10, units: 10 },
  { id: "pack-45", amount: 399, tokens: 45, units: 45 },
  { id: "pack-85", amount: 699, tokens: 85, units: 85 },
  { id: "pack-130", amount: 999, tokens: 130, units: 130 },
];

export const getPack = (id: string): TokenPack | undefined =>
  TOKEN_PACKS.find((p) => p.id === id);

export interface Balances {
  subscriptionUnits: number;
  purchasedUnits: number;
  purchasedFrozen: boolean;
}

export interface SpendPlan {
  ok: boolean;
  costUnits: number;
  fromSubscription: number;
  fromPurchased: number;
  after: Balances;
  shortfall: number;
}

/** Spends subscription units first, then purchased (§5). */
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

const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/** Allocation date in a month for an anchor day, clamped to the month's length. */
export function allocationDateInMonth(
  anchorDay: number,
  year: number,
  monthIndex: number,
): Date {
  const day = Math.min(anchorDay, daysInMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, day));
}

export function nextMonthlyAllocation(anchorDay: number, from: Date): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();

  const thisMonth = allocationDateInMonth(anchorDay, year, month);
  if (thisMonth.getTime() > from.getTime()) return thisMonth;

  return allocationDateInMonth(anchorDay, year, month + 1);
}

export function nextWeeklyAllocation(previousRenewal: Date): Date {
  return new Date(previousRenewal.getTime() + 7 * 24 * 60 * 60 * 1000);
}

export const anchorDayFrom = (signup: Date): number => signup.getUTCDate();

/** Allocation replaces the subscription balance; no rollover (§3). */
export function allocateSubscription(plan: Plan, balances: Balances): Balances {
  return {
    subscriptionUnits: PLAN_GRANTS[plan].units,
    purchasedUnits: balances.purchasedUnits,
    purchasedFrozen: balances.purchasedFrozen,
  };
}

/** Zeroes subscription units and freezes purchased ones (§7). */
export function lapse(balances: Balances): Balances {
  return {
    subscriptionUnits: 0,
    purchasedUnits: balances.purchasedUnits,
    purchasedFrozen: true,
  };
}

/** Unfreezes purchased units on resubscribe (§7). */
export function unfreeze(balances: Balances): Balances {
  return { ...balances, purchasedFrozen: false };
}

/** Upgrades take effect immediately (§7). */
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

export interface WalletView {
  subscriptionTokens: number;
  purchasedTokens: number;
  purchasedFrozen: boolean;
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

export interface WalletSnapshot extends WalletView {
  grantTokens: number;
  subscriptionPct: number;
  nextAllocationAt: string | null;
  lastPurchaseAt: string | null;
  plan: Plan | null;
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

export const EMPTY_WALLET: WalletSnapshot = walletSnapshot({
  balances: { subscriptionUnits: 0, purchasedUnits: 0, purchasedFrozen: false },
  plan: null,
});
