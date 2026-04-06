import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function getExpiry(plan: string): string | null {
  if (plan === "lifetime") return null;
  const d = new Date();
  // annual = 1 year, extend as needed for other plans
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

async function sendAccessEmail(email: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  // TODO: swap in Resend / Postmark
  // await resend.emails.send({
  //   from: "nura@yourdomain.com",
  //   to: email,
  //   subject: "Your Nura access token",
  //   html: `<p>Your access token: <strong>${token}</strong></p>
  //          <p>Or click to restore: <a href="${appUrl}/restore?token=${token}">Restore access</a></p>`
  // })
  console.log(
    `[webhook] Access token for ${email}: ${appUrl}/restore?token=${token}`,
  );
}

export async function POST(req: Request) {
  // ── 1. Read raw body FIRST — before anything else touches the request ──
  // This is the golden rule for App Router webhook handlers.
  // req.text() gives us the raw string Stripe signed; any other
  // read method (req.json(), req.body) would consume/mutate the stream.
  const rawBody = await req.text();

  // ── 2. Grab the signature header ──────────────────────────────────────
  const sig = (await headers()).get("stripe-signature");

  if (!sig) {
    console.error("[webhook] Missing stripe-signature header");
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  // ── 3. Verify the signature ────────────────────────────────────────────
  // constructEvent will throw if the signature is invalid or the
  // webhook secret is wrong. We pass the raw string (not parsed JSON)
  // so Stripe can recompute the HMAC on the exact bytes it signed.
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[webhook] Signature verification failed: ${message}`);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  console.log(`[webhook] ✅ Verified event: ${event.type} (${event.id})`);

  // ── 4. Handle events ───────────────────────────────────────────────────
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }

      case "customer.subscription.updated": {
        // Handles plan changes, payment failures that move sub to past_due etc.
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub);
        break;
      }

      default:
        // Log unhandled events — useful during dev, remove noise in prod
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    // Return 500 so Stripe retries the event (it will retry up to 3 days)
    const message = err instanceof Error ? err.message : "Handler error";
    console.error(`[webhook] Handler error for ${event.type}: ${message}`);
    return new NextResponse(`Handler Error: ${message}`, { status: 500 });
  }

  // ── 5. Always return 200 quickly ───────────────────────────────────────
  // Stripe marks the webhook as failed if it doesn't receive a 2xx within
  // 30 seconds. Return 200 as soon as processing is done.
  return new NextResponse(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const email = session.customer_details?.email;
  const plan = session.metadata?.plan ?? "annual";

  if (!email) {
    console.error("[webhook] checkout.session.completed: no email on session");
    return;
  }

  console.log("Email:", email);

  const supabase = await createServiceRoleClient();

  // Log everything relevant before the insert
  console.log("[webhook] Session ID:", session.id);
  console.log("[webhook] Email:", session.customer_details?.email);
  console.log("[webhook] Metadata:", session.metadata);
  console.log("[webhook] UI mode:", session.ui_mode);

  const { data: tokenRow, error: insertError } = await supabase
    .from("access_tokens")
    .insert({
      email,
      user_id: null, // always null here; claimed on sign-in via auth callback
      stripe_session_id: session.id,
      stripe_subscription_id: session.subscription as string | null,
      plan,
      status: "active",
      expires_at: getExpiry(plan),
    })
    .select("token, stripe_session_id")
    .single();

  console.log("[webhook] Insert result:", { tokenRow, insertError });

  if (insertError) {
    throw new Error(`Failed to insert access_token: ${insertError.message}`);
  }

  console.log(`[webhook] Access token created for ${email}`);

  // Send access email with token
  await sendAccessEmail(email, tokenRow.token);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("access_tokens")
    .update({ status: "cancelled" })
    .eq("stripe_subscription_id", sub.id);

  if (error) {
    throw new Error(`Failed to cancel access_token: ${error.message}`);
  }

  console.log(`[webhook] Subscription cancelled: ${sub.id}`);
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  // If Stripe moves the subscription to past_due or unpaid, revoke access
  if (sub.status === "past_due" || sub.status === "unpaid") {
    const supabase = await createServiceRoleClient();
    const { error } = await supabase
      .from("access_tokens")
      .update({ status: "suspended" })
      .eq("stripe_subscription_id", sub.id);

    if (error) {
      throw new Error(`Failed to suspend access_token: ${error.message}`);
    }

    console.log(`[webhook] Subscription suspended (${sub.status}): ${sub.id}`);
  }

  // If it comes back active (e.g. after a failed payment is retried)
  if (sub.status === "active") {
    const supabase = await createServiceRoleClient();
    const { error } = await supabase
      .from("access_tokens")
      .update({ status: "active" })
      .eq("stripe_subscription_id", sub.id);

    if (error) {
      throw new Error(`Failed to reactivate access_token: ${error.message}`);
    }

    console.log(`[webhook] Subscription reactivated: ${sub.id}`);
  }
}
