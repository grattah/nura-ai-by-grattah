import "server-only";
import type Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Idempotently credit a user's "extra" token bucket from a completed Stripe
 * Checkout session. Shared by the webhook (`checkout.session.completed`) and the
 * `/buy-tokens/return` page so the purchase lands synchronously and never depends
 * solely on webhook delivery. `purchase_tokens` dedups on the Stripe session id,
 * so calling this from both paths credits exactly once.
 *
 * Returns true when the purchase was (or had already been) applied.
 */
export async function creditTokenPurchaseFromSession(
  session: Stripe.Checkout.Session,
): Promise<boolean> {
  if (session.metadata?.type !== "credits") return false;
  if (session.status !== "complete") return false;

  const userId = session.client_reference_id;
  if (!userId) return false;

  const credits = parseInt(session.metadata.credits ?? "0", 10);
  if (!Number.isFinite(credits) || credits <= 0) return false;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("purchase_tokens" as never, {
    p_user: userId,
    p_units: credits,
    p_reason: "purchase",
    p_label: session.metadata.bundleId ?? "bundle",
    p_session_id: session.id,
  } as never);
  if (error) {
    throw new Error(`Failed to credit purchased tokens: ${error.message}`);
  }
  return true;
}
