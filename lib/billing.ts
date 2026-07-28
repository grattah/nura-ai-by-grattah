import "server-only";
import { format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

// Invoices are read from Stripe on demand rather than mirrored into Postgres:
// Stripe stays the source of truth (so refunds, proration and credits can't drift
// from a stale local copy) and the PDF links are per-invoice URLs we shouldn't be
// persisting anyway.

/** Display-ready invoice row for the Billing screen. */
export interface InvoiceView {
  id: string;
  /** Formatted in the invoice's OWN currency, e.g. "£79.00". */
  amount: string;
  /** Capitalised Stripe status, e.g. "Paid" / "Open". */
  status: string;
  date: string;
  /** Stripe-hosted PDF (or hosted page). Null when Stripe exposes neither. */
  downloadUrl: string | null;
}

/**
 * The user's Stripe customer id, or null.
 *
 * Deliberately does NOT filter on `status = 'active'`: a lapsed or cancelled user
 * still needs access to their past invoices. Rows without a customer id are
 * skipped so an older/partial subscription row can't mask a usable one.
 */
export async function getStripeCustomerId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0]?.stripe_customer_id ?? null;
}

/**
 * Map a Stripe invoice to the view model. Pure — unit-tested without network.
 *
 * Amounts are formatted from the invoice's own `currency` rather than a hardcoded
 * symbol, so a USD invoice never renders with a "£".
 */
export function toInvoiceView(invoice: Stripe.Invoice): InvoiceView {
  // Stripe amounts are in minor units (7900 → 79.00). Use amount_paid when there
  // is one; an unpaid/open invoice has amount_paid = 0, and `??` wouldn't fall
  // through on a zero, so test explicitly.
  const paid = invoice.amount_paid ?? 0;
  const minor = paid > 0 ? paid : (invoice.amount_due ?? 0);
  const currency = (invoice.currency ?? "gbp").toUpperCase();
  // narrowSymbol keeps foreign currencies readable — plain en-GB formatting
  // renders USD as "US$20.00".
  const amount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(minor / 100);

  const raw = invoice.status ?? "";
  const status = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "—";

  return {
    id: invoice.id ?? "",
    amount,
    status,
    date: invoice.created
      ? format(new Date(invoice.created * 1000), "MMM d, yyyy")
      : "—",
    downloadUrl: invoice.invoice_pdf ?? invoice.hosted_invoice_url ?? null,
  };
}

/**
 * The user's invoices, newest first.
 *
 * `failed` distinguishes "Stripe call errored" from "genuinely has no invoices" —
 * without it a transient Stripe outage would tell a paying user they'd never been
 * billed.
 */
export async function getUserInvoices(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 12,
): Promise<{ invoices: InvoiceView[]; failed: boolean }> {
  const customerId = await getStripeCustomerId(supabase, userId);
  if (!customerId) return { invoices: [], failed: false };

  try {
    const res = await stripe.invoices.list({ customer: customerId, limit });
    const invoices = res.data
      // Drafts aren't payments and have no usable PDF.
      .filter((inv) => inv.status && inv.status !== "draft")
      .map(toInvoiceView);
    return { invoices, failed: false };
  } catch (err) {
    console.error("[billing] failed to list Stripe invoices", err);
    return { invoices: [], failed: true };
  }
}
