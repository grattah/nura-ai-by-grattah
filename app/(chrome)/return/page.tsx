import { redirect } from "next/navigation";
import Stripe from "stripe";
import { ReturnClient } from "./return-client";
import { activateSubscriptionFromSession } from "@/lib/subscription-activate";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function ReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { session_id: sessionId } = await searchParams;
  if (!sessionId) redirect("/");

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.status === "open") redirect("/");

  if (session.status === "complete") {
    // Activate synchronously so paid access persists even if the Stripe webhook
    // is delayed, undelivered, or misconfigured. Idempotent with the webhook.
    try {
      await activateSubscriptionFromSession(session);
    } catch (err) {
      console.error("[return] activation failed", err);
    }
    return <ReturnClient />;
  }

  redirect("/");
}
