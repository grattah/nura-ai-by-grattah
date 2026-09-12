"use client";

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useCallback } from "react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE!);

interface CheckoutEmbedProps {
  clientSecret: string;
}

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
