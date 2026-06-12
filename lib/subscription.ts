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
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return data ?? null;
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
