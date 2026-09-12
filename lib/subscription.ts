import { format } from "date-fns";
import type { Plan } from "@/constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export interface ActiveSubscription {
  plan: string;
  expires_at: string | null;
}

export const ENTITLED_STATUSES = ["active", "cancelled"] as const;

const unexpired = (sub: { expires_at: string | null }): boolean =>
  !sub.expires_at || new Date(sub.expires_at) > new Date();

/** The subscription granting access right now, if any. */
export async function getEntitledSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ActiveSubscription | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, expires_at")
    .eq("user_id", userId)
    .in("status", ENTITLED_STATUSES)
    .order("created_at", { ascending: false })
    .limit(5);

  return (data ?? []).find(unexpired) ?? null;
}

/** The live billable subscription ('active' only). */
export async function getActiveSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ActiveSubscription | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

/** True when the user is entitled, including cancelled-but-paid-up. */
export async function hasActiveSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  return !!(await getEntitledSubscription(supabase, userId));
}

export async function hasEverSubscribed(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  return !!data?.length;
}

const PLAN_RANK: Record<Plan, number> = { weekly: 0, monthly: 1, annual: 2 };
const PLAN_LABEL: Record<Plan, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  annual: "Annual",
};

const rankOf = (plan: string): number => PLAN_RANK[plan as Plan] ?? -1;
const labelOf = (plan: string): string => PLAN_LABEL[plan as Plan] ?? plan;

export function blockedSubscriptionMessage(
  active: ActiveSubscription,
  requestedPlan: Plan,
): string | null {
  const isUpgrade = rankOf(requestedPlan) > rankOf(active.plan);
  if (isUpgrade) return null;

  const expiry = active.expires_at
    ? format(new Date(active.expires_at), "MMMM d, yyyy")
    : "your current period ends";
  const currentLabel = labelOf(active.plan);

  if (active.plan === requestedPlan) {
    return `You're already on the ${currentLabel} plan, active until ${expiry}. You can resubscribe once it expires.`;
  }
  return `You have an active ${currentLabel} plan until ${expiry}. You'll be able to switch to ${labelOf(requestedPlan)} once it expires.`;
}
