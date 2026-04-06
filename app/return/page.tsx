import { redirect } from "next/navigation";
import Stripe from "stripe";
import { ReturnClient } from "./return-client";

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
    return (
      <ReturnClient
        email={session.customer_details?.email ?? ""}
        stripeSessionId={sessionId}
      />
    );
  }

  redirect("/");
}
