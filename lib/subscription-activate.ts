import "server-only";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function periodEndToIso(sub: Stripe.Subscription): string | null {
  const end = sub.items?.data?.[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

/**
 * Idempotently persist an active subscription from a completed Stripe Checkout
 * session. Shared by the webhook (`checkout.session.completed`) and the `/return`
 * page so paid access is written synchronously and never depends solely on
 * webhook delivery. Upserts via the service-role client (bypasses RLS) keyed on
 * `stripe_session_id`, so calling it from both paths is safe.
 *
 * Returns true when a subscription row was written.
 */
export async function activateSubscriptionFromSession(
  session: Stripe.Checkout.Session,
): Promise<boolean> {
  // Not a subscription checkout (one-time token purchase) — nothing to do.
  // (Both callers already ensure the session is complete: the webhook only fires
  // on checkout.session.completed, and the /return page checks status first.)
  if (session.metadata?.type === "credits") return false;

  const userId = session.client_reference_id; // Supabase user_id
  if (!userId) return false;

  let expiresAt: string | null = null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    expiresAt = periodEndToIso(sub);
  }

  const supabase = createServiceRoleClient();
  // Upsert on user_id (UNIQUE) so re-payments UPDATE the single row instead of
  // inserting a new active row each time (which broke the access reads).
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_session_id: session.id,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
      plan: session.metadata?.plan ?? "annual",
      status: "active",
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    throw new Error(`Failed to activate subscription: ${error.message}`);
  }
  return true;
}
