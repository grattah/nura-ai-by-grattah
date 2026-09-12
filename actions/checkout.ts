"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  getActiveSubscription,
  blockedSubscriptionMessage,
} from "@/lib/subscription";

/** Finds or creates the user before the guest checkout OTP is sent. */
export async function initiateCheckout(
  email: string,
): Promise<{ clientSecret: string; userId: string } | { error: string }> {
  const hdrs = await headers();
  const origin = hdrs.get("origin") ?? "";

  const ip = getClientIp(hdrs);
  const { success } = await rateLimit(`initiate-checkout:${ip}`, 5, 60_000);
  if (!success) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  // Look up via SECURITY DEFINER RPC; the auth schema isn't exposed through PostgREST.
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
      userId = await lookupUserId();
      if (!userId) {
        console.error("[initiateCheckout] createUser failed:", error?.message);
        return { error: "Failed to create account. Please try again." };
      }
    }
  }

  const active = await getActiveSubscription(adminSupabase, userId);
  if (active) {
    const blocked = blockedSubscriptionMessage(active, "annual");
    if (blocked) return { error: blocked };
  }

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
