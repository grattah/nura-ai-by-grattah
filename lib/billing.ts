import "server-only";
import { format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { APP_CURRENCY, APP_LOCALE } from "@/constants";

export interface InvoiceView {
  id: string;
  amount: string;
  status: string;
  date: string;
  downloadUrl: string | null;
}

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

export function toInvoiceView(invoice: Stripe.Invoice): InvoiceView {
  const paid = invoice.amount_paid ?? 0;
  const minor = paid > 0 ? paid : (invoice.amount_due ?? 0);
  const currency = (invoice.currency ?? APP_CURRENCY).toUpperCase();
  const amount = new Intl.NumberFormat(APP_LOCALE, {
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
      .filter((inv) => inv.status && inv.status !== "draft")
      .map(toInvoiceView);
    return { invoices, failed: false };
  } catch (err) {
    console.error("[billing] failed to list Stripe invoices", err);
    return { invoices: [], failed: true };
  }
}
