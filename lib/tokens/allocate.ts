import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Plan } from "@/constants";
import {
  PLAN_GRANTS,
  anchorDayFrom,
  nextMonthlyAllocation,
  nextWeeklyAllocation,
} from "./spec";

/** Grants a subscription period's tokens (spec §3). */
export async function allocateForPayment({
  userId,
  plan,
  subscriptionStart,
  paidAt = new Date(),
}: {
  userId: string;
  plan: Plan;
  subscriptionStart?: Date | null;
  paidAt?: Date;
}): Promise<number | null> {
  const admin = createServiceRoleClient();

  const anchorDay = subscriptionStart ? anchorDayFrom(subscriptionStart) : null;

  const next =
    PLAN_GRANTS[plan].cadence === "weekly"
      ? nextWeeklyAllocation(paidAt)
      : nextMonthlyAllocation(anchorDay ?? anchorDayFrom(paidAt), paidAt);

  const { data, error } = await admin.rpc("allocate_subscription_units" as never, {
    p_user: userId,
    p_plan: plan,
    p_anchor_day: anchorDay,
    p_next_allocation: next.toISOString(),
  } as never);

  if (error) {
    console.error(`[tokens] allocation failed for ${userId}:`, error.message);
    return null;
  }
  return (data as number | null) ?? null;
}

/** Lapses the balance when the period ends without a live subscription (§7). */
export async function lapseBalance(userId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin.rpc("lapse_token_balance" as never, {
    p_user: userId,
  } as never);
  if (error) console.error(`[tokens] lapse failed for ${userId}:`, error.message);
}

/** Credits a purchased pack (1 token = 1 unit). */
export async function creditPurchasedUnits(
  userId: string,
  units: number,
  label?: string,
  // The RPC dedups on this, since checkout is credited by both /return and the webhook.
  sessionId?: string,
): Promise<number | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc("credit_purchased_units" as never, {
    p_user: userId,
    p_units: units,
    p_label: label ?? null,
    p_session_id: sessionId ?? null,
  } as never);
  if (error) {
    console.error(`[tokens] purchase credit failed for ${userId}:`, error.message);
    return null;
  }
  return (data as number | null) ?? null;
}
