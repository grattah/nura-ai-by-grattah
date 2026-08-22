import { format } from "date-fns";
import type { Plan } from "@/constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export interface ActiveSubscription {
  plan: string;
  expires_at: string | null;
}

/**
 * Statuses that still carry ENTITLEMENT — the right to use the product and
 * spend tokens.
 *
 * 'cancelled' belongs here. It means "will not renew", not "access revoked":
 * the user has paid through `expires_at` and keeps what they bought until then,
 * whether they cancelled through us (cancel_at_period_end, status stays
 * 'active') or the subscription was ended outright in Stripe or the Dashboard
 * (customer.subscription.deleted, status becomes 'cancelled' immediately). Both
 * routes must leave the paid-for period intact; only the second one used to
 * confiscate it. When a subscription simply runs its course, `expires_at` is in
 * the past by the time 'cancelled' is written, so this grants nothing extra.
 *
 * 'suspended' is deliberately absent: it means the renewal payment failed, so
 * there is no paid-for period to honour. 'expired' is past by definition.
 */
export const ENTITLED_STATUSES = ["active", "cancelled"] as const;

const unexpired = (sub: { expires_at: string | null }): boolean =>
  !sub.expires_at || new Date(sub.expires_at) > new Date();

/**
 * The subscription that grants access right now, if any.
 *
 * Distinct from getActiveSubscription below, which answers a BILLING question
 * ("is a live subscription occupying this user?"). Someone who cancelled
 * mid-period is entitled but not occupied — they can still use the product AND
 * still buy a new plan.
 */
export async function getEntitledSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ActiveSubscription | null> {
  // Filter by status first so a newer 'suspended' row can't mask an older row
  // that is still within its paid period; take a handful and pick the first
  // unexpired one rather than assuming the newest is the live one.
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, expires_at")
    .eq("user_id", userId)
    .in("status", ENTITLED_STATUSES)
    .order("created_at", { ascending: false })
    .limit(5);

  return (data ?? []).find(unexpired) ?? null;
}

/**
 * The user's live, billable subscription — 'active' only.
 *
 * Used for billing decisions (blocking a duplicate purchase, cancel/resume),
 * NOT for access. A cancelled-but-still-in-period user must be able to
 * resubscribe, so they must not look "occupied" here.
 */
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

/** True when the user may use the product — see ENTITLED_STATUSES. */
export async function hasActiveSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  return !!(await getEntitledSubscription(supabase, userId));
}

/**
 * True when the user has EVER had a subscription row (any status: active,
 * canceled, expired…). Distinguishes an "old" lapsed subscriber from a brand-new
 * user, which drives the paywall copy (new users see "Your free trial has ended";
 * old users don't) and the personalized-search lock overlay.
 */
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

/**
 * Returns a user-facing message if `requestedPlan` should be blocked given an
 * existing active subscription, or `null` if the change is allowed.
 *
 * Plans are ranked weekly < monthly < annual. Moving UP the ranking is an
 * upgrade and is allowed mid-cycle; moving down, or re-buying the same plan, is
 * blocked until the current period ends.
 */
const PLAN_RANK: Record<Plan, number> = { weekly: 0, monthly: 1, annual: 2 };
const PLAN_LABEL: Record<Plan, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  annual: "Annual",
};

// Older rows may hold a plan string that predates the current set; treat an
// unknown plan as the lowest rank so the user is never locked out of upgrading.
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
