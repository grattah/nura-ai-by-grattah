"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  getActiveSubscription,
  blockedSubscriptionMessage,
} from "@/lib/subscription";

/**
 * Called from the guest checkout flow before OTP is sent.
 * Creates (or finds) the Supabase user, then creates a Stripe Checkout session
 * with client_reference_id set to the Supabase user ID so the webhook can
 * provision access without any email-matching gymnastics.
 *
 * Returns the Stripe client_secret (for Embedded Checkout) and the user ID.
 */
export async function initiateCheckout(
  email: string,
): Promise<{ clientSecret: string; userId: string } | { error: string }> {
  const hdrs = await headers();
  const origin = hdrs.get("origin") ?? "";

  // Rate-limit unauthenticated, arbitrary-email account creation (audit H4):
  // 5 attempts / minute / IP curbs mass account-squatting and table pollution.
  const ip = getClientIp(hdrs);
  const { success } = await rateLimit(`initiate-checkout:${ip}`, 5, 60_000);
  if (!success) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  // ── 1. Find or create the Supabase user ──────────────────────────────────
  // Lookup goes through the SECURITY DEFINER RPC (auth_user_id_by_email): the
  // auth schema is NOT exposed via PostgREST, so the previous direct
  // `from("users")` read always failed silently and existing users could never
  // check out (they fell into createUser → "already registered" → error).
  const adminSupabase = createServiceRoleClient();

  const lookupUserId = async (): Promise<string | null> => {
    const { data, error } = await adminSupabase.rpc(
      "auth_user_id_by_email" as never,
      { p_email: email.toLowerCase() } as never,
    );
    if (error) {
      console.error("[initiateCheckout] email lookup failed:", error.message);
      return null;
    }
    return (data as string | null) ?? null;
  };

  let userId: string | null = await lookupUserId();

  if (!userId) {
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: false,
      user_metadata: { onboarding_source: "checkout" },
    });

    if (data.user) {
      userId = data.user.id;
    } else {
      // Lost a race (or lookup outage): the email may exist after all —
      // re-resolve before giving up.
      userId = await lookupUserId();
      if (!userId) {
        console.error("[initiateCheckout] createUser failed:", error?.message);
        return { error: "Failed to create account. Please try again." };
      }
    }
  }

  // ── 2. Block if the user already has an active subscription ──────────────
  const active = await getActiveSubscription(adminSupabase, userId);
  if (active) {
    const blocked = blockedSubscriptionMessage(active, "annual");
    if (blocked) return { error: blocked };
  }

  // ── 3. Create Stripe session with user ID as the anchor ──────────────────
  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer_email: email.toLowerCase(),
      client_reference_id: userId,
      return_url: `${origin}/return?session_id={CHECKOUT_SESSION_ID}`,
      metadata: { plan: "annual" },
    });

    if (!session.client_secret) {
      return { error: "Failed to initialise payment. Please try again." };
    }

    return { clientSecret: session.client_secret, userId };
  } catch (err) {
    console.error("[initiateCheckout] stripe.sessions.create failed:", err);
    return { error: "Payment setup failed. Please try again." };
  }
}
