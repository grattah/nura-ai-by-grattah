import "server-only";
import type Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** Idempotently credits purchased tokens from a completed Checkout session. */
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
  const { error } = await supabase.rpc("credit_purchased_units" as never, {
    p_user: userId,
    p_units: credits,
    p_label: session.metadata.bundleId ?? "pack",
    p_session_id: session.id,
  } as never);
  if (error) {
    throw new Error(`Failed to credit purchased tokens: ${error.message}`);
  }
  return true;
}
