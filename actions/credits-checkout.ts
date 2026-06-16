"use server";

import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { getBundle } from "@/lib/credits";

// One-time credit-bundle purchase. Unlike the subscription flow this uses
// mode:"payment" with inline price_data (GBP) so no Stripe dashboard prices are
// needed — the bundle catalogue lives in lib/credits.ts. The webhook reads
// metadata.{type,credits} to top up the balance after payment succeeds.
export async function createCreditCheckout(
  bundleId: string,
): Promise<{ clientSecret: string } | { error: string }> {
  const bundle = getBundle(bundleId);
  if (!bundle) return { error: "Unknown credit bundle." };

  const origin = (await headers()).get("origin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { error: "Please sign in to buy credits." };
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded_page",
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: bundle.amount,
          product_data: {
            name: `${bundle.credits} Nuko credits`,
            description: `${bundle.label} bundle — ${bundle.blurb}`,
          },
        },
      },
    ],
    return_url: `${origin}/buy-credits/return?session_id={CHECKOUT_SESSION_ID}`,
    client_reference_id: user.id,
    metadata: {
      type: "credits",
      bundleId: bundle.id,
      credits: String(bundle.credits),
    },
    ...(user.email ? { customer_email: user.email } : {}),
  });

  if (!session.client_secret) {
    return { error: "Failed to start payment. Please try again." };
  }

  return { clientSecret: session.client_secret };
}
