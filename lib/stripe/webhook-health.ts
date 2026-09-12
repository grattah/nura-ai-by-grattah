import "server-only";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";

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
  missing: RequiredEvent[];
}

export interface WebhookHealth {
  mode: "live" | "test" | "unknown";
  endpoints: EndpointConfig[];
  lastSeen: Record<string, string | null>;
  error?: string;
}

function keyMode(): WebhookHealth["mode"] {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (key.startsWith("sk_live")) return "live";
  if (key.startsWith("sk_test")) return "test";
  return "unknown";
}

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
