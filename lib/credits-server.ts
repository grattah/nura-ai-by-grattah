import "server-only";
import { creditPurchasedUnits } from "@/lib/tokens/allocate";

/** Deprecated: use lib/tokens/*. */
export async function purchase(
  userId: string,
  units: number,
  label: string,
): Promise<void> {
  await creditPurchasedUnits(userId, units, label);
}
