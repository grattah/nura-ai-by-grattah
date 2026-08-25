import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Plan } from "@/constants";
import {
  PLAN_GRANTS,
  anchorDayFrom,
  nextMonthlyAllocation,
  nextWeeklyAllocation,
} from "./spec";

/**
 * Grant a subscription period's tokens (spec §3).
 *
 * MUST be driven by a Stripe payment event. §3 is explicit: "Do not grant
 * tokens until Stripe confirms the renewal payment… never from a local timer
 * or a scheduled job that assumes success." A cron that grants on a schedule
 * would hand tokens to subscribers whose renewal actually failed.
 *
 * Idempotent by design: the RPC REPLACES the balance rather than adding to it,
 * so a webhook Stripe delivers twice cannot double-grant.
 */
export async function allocateForPayment({
  userId,
  plan,
  subscriptionStart,
  paidAt = new Date(),
}: {
  userId: string;
  plan: Plan;
  /** Subscription creation date — the source of the anniversary anchor. */
  subscriptionStart?: Date | null;
  paidAt?: Date;
}): Promise<number | null> {
  const admin = createServiceRoleClient();

  const anchorDay = subscriptionStart ? anchorDayFrom(subscriptionStart) : null;

  // Weekly renews seven days on; monthly and annual both land on the
  // anniversary day — annual is NOT front-loaded, it grants monthly.
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

/**
 * §7 — the period ended without a live subscription.
 *
 * Subscription units die, purchased units freeze. Never deletes purchased
 * value: that is money already paid, and destroying it invites chargebacks.
 */
export async function lapseBalance(userId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin.rpc("lapse_token_balance" as never, {
    p_user: userId,
  } as never);
  if (error) console.error(`[tokens] lapse failed for ${userId}:`, error.message);
}

/** §4 — credit a purchased pack (1 token = 1 unit). */
export async function creditPurchasedUnits(
  userId: string,
  units: number,
  label?: string,
  /** Stripe session id — the RPC dedups on it, since a checkout is credited
   *  from both /return and the webhook. */
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
