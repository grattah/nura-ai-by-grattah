"use client";

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useCallback } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface CheckoutEmbedProps {
  clientSecret: string;
}

/**
 * Drop-in Stripe Embedded Checkout that receives an already-created
 * client_secret. Use this anywhere you've created the session server-side
 * before rendering (e.g. identity-first guest checkout, authenticated checkout).
 */
export function CheckoutEmbed({ clientSecret }: CheckoutEmbedProps) {
  const fetchClientSecret = useCallback(
    () => Promise.resolve(clientSecret),
    [clientSecret],
  );

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ fetchClientSecret }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
