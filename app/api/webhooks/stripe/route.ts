import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { activateSubscriptionFromSession } from "@/lib/subscription-activate";
import { creditTokenPurchaseFromSession } from "@/lib/token-purchase";
import { getBundle } from "@/lib/credits";
import { sendEmail } from "@/lib/email/send";
import { APP_CURRENCY } from "@/constants";
import {
  subscriptionConfirmationEmail,
  resubscriptionEmail,
  paymentFailedEmail,
  renewalReceiptEmail,
  tokenPurchaseReceiptEmail,
  formatMoney,
} from "@/lib/email/templates";

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

function planLabel(plan: string | null | undefined): string {
  if (plan === "weekly") return "Weekly Plan";
  if (plan === "monthly") return "Monthly Plan";
  return "Premium Plan";
}

function fmtDate(iso: string | null | undefined): string | null {
  return iso ? format(new Date(iso), "MMM d, yyyy") : null;
}

// Subscription confirmation, sent from the deduped webhook so it fires once.
// Reads plan/period-end from the row activateSubscriptionFromSession just wrote.
// `isResubscribe` picks the "welcome back" copy over the first-time one.
async function sendSubscriptionConfirmation(
  userId: string,
  email: string,
  session: Stripe.Checkout.Session,
  isResubscribe: boolean,
) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  const row = data as { plan?: string; expires_at?: string | null } | null;
  const amount =
    typeof session.amount_total === "number"
      ? formatMoney(session.amount_total, session.currency ?? APP_CURRENCY)
      : null;
  const params = {
    planLabel: planLabel(row?.plan),
    renewsAt: fmtDate(row?.expires_at),
    amount,
  };
  const { subject, html } = isResubscribe
    ? resubscriptionEmail(params)
    : subscriptionConfirmationEmail(params);
  await sendEmail({ to: email, subject, html });
}

// One-time token-bundle purchase receipt.
async function sendTokenPurchaseReceipt(
  session: Stripe.Checkout.Session,
  email: string,
) {
  const credits = parseInt(session.metadata?.credits ?? "0", 10);
  const bundle = getBundle(session.metadata?.bundleId ?? "");
  const amount =
    typeof session.amount_total === "number"
      ? formatMoney(session.amount_total, session.currency ?? APP_CURRENCY)
      : "";
  const { subject, html } = tokenPurchaseReceiptEmail({
    credits,
    amount,
    bundleLabel: bundle?.label ?? null,
  });
  await sendEmail({ to: email, subject, html });
}

// Resolve the account behind a Stripe customer id (invoice events don't carry
// client_reference_id) — reads the newest subscription row's user_id, then the
// auth user for their email.
async function getUserForCustomer(
  customerId: string,
): Promise<{ userId: string; email: string; plan?: string } | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id, plan")
    .eq("stripe_customer_id", customerId)
    .order("updated_at", { ascending: false })
    .limit(1);
  const row = data?.[0] as { user_id: string; plan: string } | undefined;
  if (!row) return null;

  const { data: userData } = await supabase.auth.admin.getUserById(row.user_id);
  const email = userData?.user?.email;
  if (!email) return null;
  return { userId: row.user_id, email, plan: row.plan };
}

// Best-effort decline reason from the invoice's PaymentIntent, e.g. "Your card
// was declined." Invoices don't carry payment_intent directly (API 2025+), so
// this looks it up via the invoice's InvoicePayment. Falls back to null so the
// email still sends without one.
async function paymentFailureReason(
  invoice: Stripe.Invoice,
): Promise<string | null> {
  if (!invoice.id) return null;
  try {
    const payments = await stripe.invoicePayments.list({
      invoice: invoice.id,
      limit: 1,
    });
    const piRef = payments.data[0]?.payment.payment_intent;
    const piId = typeof piRef === "string" ? piRef : piRef?.id;
    if (!piId) return null;

    const pi = await stripe.paymentIntents.retrieve(piId);
    return pi.last_payment_error?.message ?? null;
  } catch (e) {
    console.error("[webhook] failed to retrieve decline reason", e);
    return null;
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
      case "invoice.payment_succeeded": {
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      }
      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
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

/**
 * True when this Stripe customer has subscribed before today's checkout.
 * Errs toward "first-time" — sending a first-timer's welcome to a returning
 * customer is a far smaller wrong than the reverse, which is what QA reported.
 */
async function hasPriorSubscription(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<boolean> {
  const customerId = typeof customer === "string" ? customer : customer?.id;
  if (!customerId) return false;
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 2,
    });
    return subs.data.length > 1;
  } catch (e) {
    console.error("[webhook] prior-subscription lookup failed", e);
    return false;
  }
}

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
    if (email) {
      try {
        await sendTokenPurchaseReceipt(session, email);
      } catch (e) {
        console.error("[webhook] token purchase receipt email failed", e);
      }
    }
    return;
  }

  // Resubscribe detection asks STRIPE, not our own table.
  //
  // This used to check "does a subscriptions row exist for this user?" — but
  // /return calls activateSubscriptionFromSession() synchronously on redirect,
  // so by the time this webhook ran the row it was looking for had just been
  // written by the very same checkout. Every first-time subscriber who reached
  // /return before the webhook got the "welcome back" copy. The row can't
  // distinguish the two cases at all: the upsert is keyed on user_id, so a
  // genuine resubscribe overwrites the same single row.
  //
  // Stripe keeps every subscription object it has ever created for a customer
  // (cancelled ones persist), so >1 means they have subscribed before.
  const isResubscribe = await hasPriorSubscription(session.customer);

  // Persist the active subscription (shared with the /return synchronous path).
  await activateSubscriptionFromSession(session);

  if (email) {
    try {
      await sendSubscriptionConfirmation(userId, email, session, isResubscribe);
    } catch (e) {
      console.error("[webhook] confirmation email failed", e);
    }
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
  // Every Stripe status we can act on. Terminal states used to fall through to
  // "no change", which is how rows kept saying "active" after they had ended.
  let status: "active" | "suspended" | "cancelled" | "expired" | null = null;
  if (sub.status === "past_due" || sub.status === "unpaid" || sub.status === "paused")
    status = "suspended";
  else if (sub.status === "active" || sub.status === "trialing") status = "active";
  else if (sub.status === "canceled") status = "cancelled";
  else if (sub.status === "incomplete_expired") status = "expired";

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

  // Persist the period end and the cancel-at-period-end flag (and status when it
  // mapped to one). We always write so the flag stays in sync.
  const incomingCancel = !!sub.cancel_at_period_end;
  const update: Record<string, unknown> = {
    expires_at: periodEndToIso(sub),
    cancel_at_period_end: incomingCancel,
  };
  if (status) update.status = status;

  const { error } = await supabase
    .from("subscriptions")
    .update(update as never)
    .eq("stripe_subscription_id", sub.id);

  if (error) throw new Error(`Failed to update subscription: ${error.message}`);
  console.log(
    `[webhook] Subscription ${sub.id} updated (status=${status ?? "unchanged"}, cancelAtPeriodEnd=${incomingCancel})`,
  );
}

// Renewal receipt — fires for every invoice payment, but the very first one
// (billing_reason "subscription_create") is already covered by the checkout
// confirmation/resubscription email, so only future charges send here.
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (invoice.billing_reason === "subscription_create") return;

  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  // Push the period forward FIRST. This used to only send an email, leaving the
  // row's expires_at on the previous period and relying entirely on
  // customer.subscription.updated also arriving — so a renewal that delivered
  // only this event left the subscription looking expired.
  // Stripe's 2025+ API moved the subscription off the invoice root and under
  // `parent.subscription_details` — `invoice.subscription` no longer exists.
  const subRef = invoice.parent?.subscription_details?.subscription;
  const subId = typeof subRef === "string" ? subRef : subRef?.id;
  if (subId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      const end = periodEndToIso(sub);
      if (end) {
        await createServiceRoleClient()
          .from("subscriptions")
          .update({
            status: "active",
            expires_at: end,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("stripe_subscription_id", subId);
      }
    } catch (e) {
      console.error("[webhook] failed to extend period on renewal", e);
    }
  }

  const user = await getUserForCustomer(customerId);
  if (!user) {
    console.log(`[webhook] No user found for customer ${customerId}`);
    return;
  }

  const paidAtIso = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    : new Date(invoice.created * 1000).toISOString();

  try {
    const { subject, html } = renewalReceiptEmail({
      planLabel: planLabel(user.plan),
      amount: formatMoney(invoice.amount_paid, invoice.currency ?? APP_CURRENCY),
      date: fmtDate(paidAtIso) ?? "",
      invoiceUrl: invoice.hosted_invoice_url ?? invoice.invoice_pdf ?? null,
    });
    await sendEmail({ to: user.email, subject, html });
  } catch (e) {
    console.error("[webhook] renewal receipt email failed", e);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  // getUserForCustomer() resolves via a subscriptions row, which does NOT exist
  // when the very FIRST payment of a new subscription fails — there was no
  // successful checkout to write one. That path used to return here silently, so
  // a failed initial subscription notified nobody. Fall back to the email Stripe
  // already put on the invoice.
  const user = await getUserForCustomer(customerId);
  const email = user?.email ?? invoice.customer_email ?? null;
  if (!email) {
    console.log(`[webhook] No email to notify for customer ${customerId}`);
    return;
  }

  const reason = await paymentFailureReason(invoice);
  // A first-payment failure means they never had access to lose.
  const isFirstPayment = !user || invoice.billing_reason === "subscription_create";

  try {
    const { subject, html } = paymentFailedEmail({
      planLabel: planLabel(user?.plan),
      reason,
      isFirstPayment,
    });
    await sendEmail({ to: email, subject, html });
  } catch (e) {
    console.error("[webhook] payment failed email failed", e);
  }
}
