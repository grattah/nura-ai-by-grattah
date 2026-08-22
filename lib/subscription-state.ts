import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { ENTITLED_STATUSES } from "@/lib/subscription";

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

  // Expiry is DERIVED, not a status. Lapsed means either a status that carries
  // no entitlement ('suspended' — the renewal payment failed; 'expired'), or an
  // entitled status whose paid period has run out. 'cancelled' is entitled
  // while expires_at is still ahead: the user paid for that period and keeps it
  // (see ENTITLED_STATUSES). Keying off the status string alone would both
  // strand paid-up cancellers and miss an 'active' row left stale by a webhook
  // event we never received.
  const live =
    (ENTITLED_STATUSES as readonly string[]).includes(sub.status) &&
    (!sub.expires_at || new Date(sub.expires_at) > new Date());

  return {
    state: live ? "active" : "expired",
    plan: sub.plan,
    expiresAt: sub.expires_at,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
  };
}
