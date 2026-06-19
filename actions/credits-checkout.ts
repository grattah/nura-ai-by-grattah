"use server";

import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { getBundle } from "@/lib/credits";

// One-time extra-token purchase. Unlike the subscription flow this uses
// mode:"payment" with inline price_data (GBP) so no Stripe dashboard prices are
// needed — the bundle catalogue lives in lib/credits.ts. The webhook reads
// metadata.{type,credits} and tops up the user's "extra" token bucket.
export async function createTokenCheckout(
  bundleId: string,
): Promise<{ clientSecret: string } | { error: string }> {
  const bundle = getBundle(bundleId);
  if (!bundle) return { error: "Unknown token bundle." };

  const origin = (await headers()).get("origin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { error: "Please sign in to buy tokens." };
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
            name: `${bundle.credits} Nuko tokens`,
            description: `${bundle.label} bundle — ${bundle.blurb}`,
          },
        },
      },
    ],
    return_url: `${origin}/buy-tokens/return?session_id={CHECKOUT_SESSION_ID}&credits=${bundle.credits}`,
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
