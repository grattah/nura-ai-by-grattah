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

export function activeSubscriptionMessage(
  active: ActiveSubscription,
  requestedPlan: "annual" | "monthly",
): string {
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
