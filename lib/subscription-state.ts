import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { ENTITLED_STATUSES } from "@/lib/subscription";

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

  // Expiry is derived from expires_at, not the status string.
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
