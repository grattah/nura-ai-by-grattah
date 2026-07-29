import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Which plan card a user should see on /manage-subscription and /billing-history.
 *
 * Both pages previously queried `status = 'active'` and redirected to /checkout
 * when nothing matched, so lapsed and never-subscribed users could never reach
 * either page. This resolver replaces that: it reads the newest subscription row
 * of ANY status and derives the state, so the two pages can't drift apart.
 */
export type SubscriptionState = "active" | "expired" | "free";

export interface SubscriptionView {
  state: SubscriptionState;
  plan: string | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionRow {
  status: string;
  plan: string;
  expires_at: string | null;
  cancel_at_period_end?: boolean;
}

export async function getSubscriptionView(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<SubscriptionView> {
  // No status filter — an expired user still has a row, and it's the row we need
  // in order to show which plan lapsed and when.
  const { data } = await supabase
    .from("subscriptions")
    .select("status, plan, expires_at, cancel_at_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const sub = data?.[0] as SubscriptionRow | undefined;
  if (!sub) {
    return { state: "free", plan: null, expiresAt: null, cancelAtPeriodEnd: false };
  }

  // Expiry is DERIVED, not a status: there is no 'expired' status in the schema.
  // Three distinct signals all mean lapsed —
  //   • 'cancelled'  — Stripe fired customer.subscription.deleted
  //   • 'suspended'  — Stripe past_due/unpaid (failed renewal)
  //   • 'active' with a past expires_at — reachable because the webhook does NOT
  //     handle invoice.payment_failed, so a missed event leaves the row stale.
  // Keying off the status string alone would miss that third case.
  const live =
    sub.status === "active" &&
    (!sub.expires_at || new Date(sub.expires_at) > new Date());

  return {
    state: live ? "active" : "expired",
    plan: sub.plan,
    expiresAt: sub.expires_at,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
  };
}
