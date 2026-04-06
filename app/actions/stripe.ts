"use server";

import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function fetchClientSecret() {
  const origin = (await headers()).get("origin");

  // Pre-fill email if user is already signed in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded_page",
    line_items: [
      {
        price: "price_1TIxBlGkqlyarHOT9Rtnhx8M",
        quantity: 1,
      },
    ],
    mode: "subscription",
    return_url: `${origin}/return?session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      plan: "annual", // ← your webhook reads this
    },
    ...(user?.email ? { customer_email: user.email } : {}),
  });

  return session.client_secret;
}
