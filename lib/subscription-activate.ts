import "server-only";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Plan } from "@/constants";
import { allocateForPayment } from "@/lib/tokens/allocate";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function periodEndToIso(sub: Stripe.Subscription): string | null {
  const end = sub.items?.data?.[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

/** Idempotently activates a subscription from a completed Checkout session. */
export async function activateSubscriptionFromSession(
  session: Stripe.Checkout.Session,
): Promise<boolean> {
  if (session.metadata?.type === "credits") return false;

  const userId = session.client_reference_id;
  if (!userId) return false;

  let expiresAt: string | null = null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    expiresAt = periodEndToIso(sub);
  }

  const supabase = createServiceRoleClient();
  const plan = (session.metadata?.plan ?? "annual") as Plan;

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_session_id: session.id,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
      plan,
      status: "active",
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    throw new Error(`Failed to activate subscription: ${error.message}`);
  }

  // Initial grant only; renewals come from invoice.payment_succeeded and the RPC replaces rather than adds.
  await allocateForPayment({
    userId,
    plan,
    subscriptionStart: new Date(),
  });

  return true;
}
