import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// The webhook-event dedup table isn't in the generated Database types yet
// (no DB access to regenerate here), so give it a minimal local type and a
// dedicated service-role client. Service-role bypasses RLS by design.
type WebhookEventsSchema = {
  __InternalSupabase: { PostgrestVersion: "14.4" };
  public: {
    Tables: {
      stripe_webhook_events: {
        Row: { id: string; type: string; created: string; processed_at: string };
        Insert: {
          id: string;
          type: string;
          created: string;
          processed_at?: string;
        };
        Update: { processed_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function createEventsClient() {
  return createSbClient<WebhookEventsSchema>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Turn a Stripe subscription's current period end (unix seconds) into an ISO
// timestamp. This is the source of truth for entitlement expiry — never a
// hardcoded "+1 year" (audit finding C2).
function periodEndToIso(sub: Stripe.Subscription): string | null {
  // Stripe API v22 exposes current_period_end on the subscription item.
  const end = sub.items?.data?.[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

async function sendWelcomeEmail(email: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const adminSupabase = createServiceRoleClient();

  // Generate a magic link to include in the email as backup.
  // SECURITY (audit finding H5): the action_link is a login credential and must
  // never be logged. It is handed straight to the email provider.
  const { data: linkData } = await adminSupabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${appUrl}/auth/callback?next=/` },
  });

  const actionLink = linkData?.properties?.action_link;

  // TODO: swap in Resend / Postmark
  // await resend.emails.send({
  //   from: "nura@yourdomain.com",
  //   to: email,
  //   subject: "Welcome to Nura",
  //   html: `<p>Click to access your account: <a href="${actionLink}">Open Nura</a></p>`
  // })

  if (!actionLink) {
    console.warn(`[webhook] Could not generate welcome link for ${email}`);
  } else {
    console.log(`[webhook] Welcome email queued for ${email}`);
  }
}

export async function POST(req: Request) {
  // ── 1. Read raw body FIRST (required for signature verification) ──────────
  const rawBody = await req.text();

  // ── 2. Signature header ───────────────────────────────────────────────────
  const sig = (await headers()).get("stripe-signature");
  if (!sig) {
    console.error("[webhook] Missing stripe-signature header");
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  // ── 3. Verify signature ───────────────────────────────────────────────────
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

  const events = createEventsClient();

  // ── 4. Idempotency: skip events we've already processed (audit M2) ─────────
  const { error: dedupError } = await events
    .from("stripe_webhook_events")
    .insert({
      id: event.id,
      type: event.type,
      created: new Date(event.created * 1000).toISOString(),
    });

  if (dedupError) {
    // Unique-violation => already processed. Ack with 200 so Stripe stops retrying.
    if (dedupError.code === "23505") {
      console.log(`[webhook] Duplicate event ignored: ${event.id}`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Any other write error: 500 so Stripe retries.
    console.error(`[webhook] Dedup insert failed: ${dedupError.message}`);
    return new NextResponse("Dedup error", { status: 500 });
  }

  console.log(`[webhook] ✅ Verified event: ${event.type} (${event.id})`);

  // ── 5. Handle events ──────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    // Return 500 so Stripe retries. Also remove the dedup row so the retry is
    // actually reprocessed rather than being swallowed as a duplicate.
    await events.from("stripe_webhook_events").delete().eq("id", event.id);
    const message = err instanceof Error ? err.message : "Handler error";
    console.error(`[webhook] Handler error for ${event.type}: ${message}`);
    return new NextResponse(`Handler Error: ${message}`, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id; // Supabase user_id
  const email = session.customer_details?.email;

  if (!userId) {
    throw new Error("No client_reference_id on checkout session");
  }

  const supabase = createServiceRoleClient();

  // Pull the real subscription to read its true period end and plan.
  let expiresAt: string | null = null;
  const subscriptionId = session.subscription as string | null;
  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    expiresAt = periodEndToIso(sub);
  }

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_session_id: session.id,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
      plan: session.metadata?.plan ?? "annual",
      status: "active",
      expires_at: expiresAt,
    },
    { onConflict: "stripe_session_id" },
  );

  if (email) {
    await sendWelcomeEmail(email);
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("stripe_subscription_id", sub.id);

  if (error) throw new Error(`Failed to cancel subscription: ${error.message}`);
  console.log(`[webhook] Subscription cancelled: ${sub.id}`);
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const supabase = createServiceRoleClient();

  // Map Stripe status → our status. Keep expiry in sync with the real period end.
  let status: "active" | "suspended" | null = null;
  if (sub.status === "past_due" || sub.status === "unpaid") status = "suspended";
  else if (sub.status === "active") status = "active";

  if (!status) {
    console.log(`[webhook] Subscription ${sub.id} status ${sub.status} — no change`);
    return;
  }

  // Ordering guard (audit M2): never resurrect a subscription that has already
  // been cancelled in our DB. Stripe can deliver a stale "updated(active)" after
  // a "deleted". A cancelled row stays cancelled unless Stripe reports the sub as
  // active AND it has a future period end.
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();

  if (existing?.status === "cancelled" && status === "active") {
    const end = periodEndToIso(sub);
    const stillValid = !!end && new Date(end) > new Date();
    if (!stillValid) {
      console.log(`[webhook] Ignoring stale active update for cancelled ${sub.id}`);
      return;
    }
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({ status, expires_at: periodEndToIso(sub) })
    .eq("stripe_subscription_id", sub.id);

  if (error) throw new Error(`Failed to update subscription: ${error.message}`);
  console.log(`[webhook] Subscription ${sub.id} → ${status}`);
}
