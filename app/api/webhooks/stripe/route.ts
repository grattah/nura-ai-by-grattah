import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { activateSubscriptionFromSession } from "@/lib/subscription-activate";
import { creditTokenPurchaseFromSession } from "@/lib/token-purchase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type WebhookEventsSchema = {
  __InternalSupabase: { PostgrestVersion: "14.4" };
  public: {
    Tables: {
      stripe_webhook_events: {
        Row: {
          id: string;
          type: string;
          created: string;
          processed_at: string;
        };
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

function periodEndToIso(sub: Stripe.Subscription): string | null {
  const end = sub.items?.data?.[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

async function sendWelcomeEmail(email: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const adminSupabase = createServiceRoleClient();

  const { data: linkData } = await adminSupabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${appUrl}/auth/callback?next=/` },
  });

  const actionLink = linkData?.properties?.action_link;

  // TODO: swap in Resend / Postmark
  // await resend.emails.send({
  //   from: "nuko@yourdomain.com",
  //   to: email,
  //   subject: "Welcome to Nuko",
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
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    // Return 500 so Stripe retries. Also remove the dedup row so the retry is

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

  // One-time token-bundle purchase (mode:"payment"). Credit the user's "extra"
  // bucket via the shared helper (idempotent per Stripe session — safe alongside
  // the synchronous /buy-tokens/return credit).
  if (session.metadata?.type === "credits") {
    await creditTokenPurchaseFromSession(session);
    console.log(`[webhook] Credited token purchase for ${userId}`);
    return;
  }

  // Persist the active subscription (shared with the /return synchronous path).
  await activateSubscriptionFromSession(session);

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
  if (sub.status === "past_due" || sub.status === "unpaid")
    status = "suspended";
  else if (sub.status === "active") status = "active";

  if (!status) {
    console.log(
      `[webhook] Subscription ${sub.id} status ${sub.status} — no change`,
    );
    return;
  }

  const { data: existingRows } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("stripe_subscription_id", sub.id)
    .limit(1);
  const existing = existingRows?.[0];

  if (existing?.status === "cancelled" && status === "active") {
    const end = periodEndToIso(sub);
    const stillValid = !!end && new Date(end) > new Date();
    if (!stillValid) {
      console.log(
        `[webhook] Ignoring stale active update for cancelled ${sub.id}`,
      );
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
