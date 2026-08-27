import "server-only";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Is Stripe actually configured to send us what the webhook handles?
 *
 * Renewal and payment-failure emails never sent for months. The handlers were
 * written and correct; `invoice.payment_succeeded` and `invoice.payment_failed`
 * simply were not among the endpoint's enabled events, so Stripe never
 * delivered them and the handlers never ran.
 *
 * That failure is completely silent — a handler that never fires looks exactly
 * like a handler with nothing to do. Worse, it took more than email with it:
 * the same handler extends `expires_at` and grants the renewal's tokens, so
 * subscriptions drifted to "expired" while Stripe still billed them.
 *
 * Two independent things can go wrong, so both are checked:
 *   • NOT ENABLED  — Stripe was never asked to send it (this outage)
 *   • NEVER SEEN   — enabled, but nothing arrived (the retired-domain outage,
 *                    where every delivery 307'd and Stripe does not follow
 *                    redirects)
 */

/**
 * Every event type the switch in app/api/webhooks/stripe/route.ts handles.
 *
 * Kept beside a test that reads that file, so adding a `case` without adding it
 * here fails rather than quietly creating another unmonitored handler.
 */
export const REQUIRED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.deleted",
  "customer.subscription.updated",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
] as const;

export type RequiredEvent = (typeof REQUIRED_EVENTS)[number];

export interface EndpointConfig {
  id: string;
  url: string;
  status: string;
  /** Required events this endpoint is NOT configured to send. */
  missing: RequiredEvent[];
}

export interface WebhookHealth {
  /** Which Stripe mode the key addresses. A test key cannot see live endpoints. */
  mode: "live" | "test" | "unknown";
  endpoints: EndpointConfig[];
  /** Most recent delivery per event type; null when never received. */
  lastSeen: Record<string, string | null>;
  error?: string;
}

function keyMode(): WebhookHealth["mode"] {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (key.startsWith("sk_live")) return "live";
  if (key.startsWith("sk_test")) return "test";
  return "unknown";
}

/** Enabled events per endpoint, and which required ones are absent. */
export async function checkWebhookConfig(): Promise<
  { endpoints: EndpointConfig[] } | { error: string }
> {
  try {
    const list = await stripe.webhookEndpoints.list({ limit: 20 });
    return {
      endpoints: list.data.map((e) => {
        const enabled = new Set(e.enabled_events);
        return {
          id: e.id,
          url: e.url,
          status: e.status ?? "unknown",
          // Stripe's "*" wildcard means everything is enabled.
          missing: enabled.has("*")
            ? []
            : REQUIRED_EVENTS.filter((t) => !enabled.has(t)),
        };
      }),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Stripe lookup failed" };
  }
}

/**
 * Last time each required event was actually received.
 *
 * Reads the dedup table the webhook already writes to, so it needs no new
 * bookkeeping. A type absent from that table has never been delivered.
 */
export async function lastSeenByType(): Promise<Record<string, string | null>> {
  const seen: Record<string, string | null> = Object.fromEntries(
    REQUIRED_EVENTS.map((t) => [t, null]),
  );

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("stripe_webhook_events")
    .select("type, processed_at")
    .order("processed_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("[webhook-health] delivery history unavailable:", error.message);
    return seen;
  }

  // Ordered newest-first, so the first row per type is its latest delivery.
  for (const row of (data ?? []) as { type: string; processed_at: string }[]) {
    if (seen[row.type] == null) seen[row.type] = row.processed_at;
  }
  return seen;
}

export async function getWebhookHealth(): Promise<WebhookHealth> {
  const [config, lastSeen] = await Promise.all([
    checkWebhookConfig(),
    lastSeenByType(),
  ]);

  return {
    mode: keyMode(),
    endpoints: "endpoints" in config ? config.endpoints : [],
    lastSeen,
    error: "error" in config ? config.error : undefined,
  };
}
