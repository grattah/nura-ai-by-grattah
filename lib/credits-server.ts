import "server-only";
import { creditPurchasedUnits } from "@/lib/tokens/allocate";

// The old token model (rolling weekly window + "extra" bucket, metered from
// real Claude usage) has been replaced by lib/tokens/* per the 21 Aug 2026
// spec: fixed per-action costs in units, plan-based grants, reserve-then-settle.
//
// Reading balances    → lib/tokens/server.ts  (getBalances / getWallet)
// Spending            → lib/tokens/server.ts  (reserve / settle / release)
// Granting            → lib/tokens/allocate.ts
//
// This file survives only as the purchase entry point used by the Stripe
// webhook, which still calls it by name.

/** Credit a purchased pack. 1 purchased token = 1 unit (spec §2/§4). */
export async function purchase(
  userId: string,
  units: number,
  label: string,
): Promise<void> {
  await creditPurchasedUnits(userId, units, label);
}
