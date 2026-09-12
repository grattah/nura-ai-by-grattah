"use server";

import { revalidatePath } from "next/cache";
import {
  createClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@/lib/email/send";
import { cancellationEmail, resubscriptionEmail } from "@/lib/email/templates";
import { format } from "date-fns";

type Result = { success: true } | { error: string };

function planLabel(plan: string | null | undefined): string {
  if (plan === "weekly") return "Weekly Plan";
  if (plan === "monthly") return "Monthly Plan";
  return "Premium Plan";
}

async function getActiveSub(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, plan, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);
  return (
    (data?.[0] as
      | { stripe_subscription_id: string | null; plan: string; expires_at: string | null }
      | undefined) ?? null
  );
}

/** Cancels at period end; the user keeps access until expires_at. */
export async function cancelSubscription(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated" };

  const sub = await getActiveSub(user.id);
  if (!sub?.stripe_subscription_id) {
    return { error: "No active subscription to cancel" };
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to cancel" };
  }

  await createServiceRoleClient()
    .from("subscriptions")
    .update({ cancel_at_period_end: true } as never)
    .eq("user_id", user.id);

  try {
    const { subject, html } = cancellationEmail({
      planLabel: planLabel(sub.plan),
      accessUntil: sub.expires_at
        ? format(new Date(sub.expires_at), "MMM d, yyyy")
        : null,
    });
    await sendEmail({ to: user.email, subject, html });
  } catch (e) {
    console.error("[cancel-subscription] email failed", e);
  }

  revalidatePath("/manage-subscription");
  return { success: true };
}

export async function reactivateSubscription(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated" };

  const sub = await getActiveSub(user.id);
  if (!sub?.stripe_subscription_id) {
    return { error: "No subscription to resume" };
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to resume" };
  }

  await createServiceRoleClient()
    .from("subscriptions")
    .update({ cancel_at_period_end: false } as never)
    .eq("user_id", user.id);

  try {
    const { subject, html } = resubscriptionEmail({
      planLabel: planLabel(sub.plan),
      renewsAt: sub.expires_at
        ? format(new Date(sub.expires_at), "MMM d, yyyy")
        : null,
    });
    await sendEmail({ to: user.email, subject, html });
  } catch (e) {
    console.error("[reactivate-subscription] email failed", e);
  }

  revalidatePath("/manage-subscription");
  return { success: true };
}
