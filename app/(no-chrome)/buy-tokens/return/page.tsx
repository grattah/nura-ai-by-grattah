import { Suspense } from "react";
import Stripe from "stripe";
import { BuyTokensReturnClient } from "./return-client";
import { creditTokenPurchaseFromSession } from "@/lib/token-purchase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function BuyTokensReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { session_id: sessionId } = await searchParams;

  // Credit the extra tokens synchronously so the purchase lands even if the
  // Stripe webhook is delayed/undelivered. Idempotent with the webhook.
  // Read the credited amount from the verified Stripe session (not the URL
  // param) so the success copy can't be spoofed (audit L4).
  let credits: string | null = null;
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      await creditTokenPurchaseFromSession(session);
      credits = (session.metadata?.credits as string | undefined) ?? null;
    } catch (err) {
      console.error("[buy-tokens/return] credit failed", err);
    }
  }

  return (
    <Suspense fallback={<Fallback />}>
      <BuyTokensReturnClient credits={credits} />
    </Suspense>
  );
}

function Fallback() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background gap-3">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-muted-foreground text-sm">Confirming your tokens…</p>
    </div>
  );
}
