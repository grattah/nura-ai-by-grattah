"use server";

import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import {
  getActiveSubscription,
  blockedSubscriptionMessage,
} from "@/lib/subscription";

export async function fetchClientSecretForPlan(
  plan: "annual" | "monthly" = "annual",
): Promise<{ clientSecret: string } | { error: string }> {
  const origin = (await headers()).get("origin");
  const priceId =
    plan === "monthly"
      ? (process.env.STRIPE_PRICE_ID_MONTHLY ?? process.env.STRIPE_PRICE_ID)
      : process.env.STRIPE_PRICE_ID;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    const active = await getActiveSubscription(supabase, user.id);
    if (active) {
      const blocked = blockedSubscriptionMessage(active, plan);
      if (blocked) return { error: blocked };
    }
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded_page",
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    return_url: `${origin}/return?session_id={CHECKOUT_SESSION_ID}`,
    metadata: { plan },
    ...(user?.id ? { client_reference_id: user.id } : {}),
    ...(user?.email ? { customer_email: user.email } : {}),
  });

  if (!session.client_secret) {
    return { error: "Failed to start payment. Please try again." };
  }

  return { clientSecret: session.client_secret };
}

export async function fetchClientSecret() {
  const origin = (await headers()).get("origin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded_page",
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: "subscription",
    return_url: `${origin}/return?session_id={CHECKOUT_SESSION_ID}`,
    metadata: { plan: "annual" },
    ...(user?.id ? { client_reference_id: user.id } : {}),
    ...(user?.email ? { customer_email: user.email } : {}),
  });

  return session.client_secret;
}
