import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { COSTS, type CreditAction } from "@/lib/credits";

// Server-side credit operations via the SECURITY DEFINER RPCs. Callers must have
// already verified auth + subscription; pass the authenticated user's id.

/** Today's balance after applying the daily grant (idempotent). */
export async function getBalance(userId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { data } = await admin.rpc("grant_daily" as never, {
    p_user: userId,
  } as never);
  return (data as number | null) ?? 0;
}

export type SpendResult = { ok: boolean; balance: number };

/** Atomically grant-then-spend the cost of `action`. */
export async function spend(
  userId: string,
  action: CreditAction,
  label?: string,
): Promise<SpendResult> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc("spend_credits" as never, {
    p_user: userId,
    p_amount: COSTS[action],
    p_reason: "spend",
    p_label: label ?? action,
  } as never);
  if (error || !data) return { ok: false, balance: 0 };
  const result = data as { ok: boolean; balance: number };
  return { ok: result.ok, balance: result.balance };
}

/** Refund a previously-charged action (e.g. the LLM call failed after spending). */
export async function refund(
  userId: string,
  action: CreditAction,
): Promise<void> {
  const admin = createServiceRoleClient();
  await admin.rpc("add_credits" as never, {
    p_user: userId,
    p_amount: COSTS[action],
    p_reason: "refund",
    p_label: action,
  } as never);
}
