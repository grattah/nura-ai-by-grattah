"use server";

import { createClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";

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
  const origin = (await headers()).get("origin") ?? "";

  // ── 1. Find or create the Supabase user ──────────────────────────────────
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "auth" } },
  );

  let userId: string;

  const { data: existingUser } = await authClient
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const adminSupabase = createServiceRoleClient();
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: false,
      user_metadata: { onboarding_source: "checkout" },
    });

    if (error || !data.user) {
      console.error("[initiateCheckout] createUser failed:", error?.message);
      return { error: "Failed to create account. Please try again." };
    }

    userId = data.user.id;
  }

  // ── 2. Create Stripe session with user ID as the anchor ──────────────────
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
