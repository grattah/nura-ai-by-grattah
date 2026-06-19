import { format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export interface ActiveSubscription {
  plan: string;
  expires_at: string | null;
}

export async function getActiveSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ActiveSubscription | null> {
  // NB: use limit(1), NOT .maybeSingle() — a user can legitimately have more
  // than one `active` row (e.g. re-payments). maybeSingle() ERRORS on >1 match,
  // which would silently read as "no subscription" and lock the user out.
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

/** True when the user has an active, unexpired subscription. */
export async function hasActiveSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const sub = await getActiveSubscription(supabase, userId);
  return !!sub && (!sub.expires_at || new Date(sub.expires_at) > new Date());
}

/**
 * Returns a user-facing message if `requestedPlan` should be blocked given an
 * existing active subscription, or `null` if the change is allowed.
 *
 * Allowed: monthly -> annual (upgrade), even mid-cycle.
 * Blocked: resubscribing to the same plan, and annual -> monthly (downgrade)
 * while the annual plan is still active.
 */
export function blockedSubscriptionMessage(
  active: ActiveSubscription,
  requestedPlan: "annual" | "monthly",
): string | null {
  const isUpgrade = active.plan === "monthly" && requestedPlan === "annual";
  if (isUpgrade) return null;

  const expiry = active.expires_at
    ? format(new Date(active.expires_at), "MMMM d, yyyy")
    : "your current period ends";
  const currentLabel = active.plan === "monthly" ? "Monthly" : "Annual";

  if (active.plan === requestedPlan) {
    return `You're already on the ${currentLabel} plan, active until ${expiry}. You can resubscribe once it expires.`;
  }
  const requestedLabel = requestedPlan === "monthly" ? "Monthly" : "Annual";
  return `You have an active ${currentLabel} plan until ${expiry}. You'll be able to switch to ${requestedLabel} once it expires.`;
}
