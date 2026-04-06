"use server";

import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";

export async function fetchClientSecret() {
  const origin = (await headers()).get("origin");

  // Create Checkout Sessions from body params.
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
  });

  return session.client_secret;
}
