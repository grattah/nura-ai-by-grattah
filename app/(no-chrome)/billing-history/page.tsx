import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { getUserInvoices } from "@/lib/billing";
import { getSubscriptionView } from "@/lib/subscription-state";
import { CancelSubscriptionButton } from "@/components/subscription/cancel-subscription-button";
import BackButton from "@/components/back-button";
import Invoice from "@/components/subscription/invoice";

export default async function page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Same resolver as /manage-subscription — no redirect, so a lapsed user can
  // still reach their invoices (getUserInvoices already serves them).
  const sub = await getSubscriptionView(supabase, user.id);

  // Read live from Stripe — nothing stores invoices locally.
  const { invoices, failed } = await getUserInvoices(supabase, user.id);

  const nextBilling = sub.expiresAt
    ? format(new Date(sub.expiresAt), "MMM d, yyyy")
    : "—";
  return (
    <div className="min-h-dvh bg-background pb-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center px-6 pt-5 pb-10 relative">
        <BackButton className="size-10 absolute left-4 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity" />

        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-xl font-semibold text-foreground">Billing</h1>
        </div>
      </div>
      <div className="px-6 space-y-4 flex flex-col flex-1">
        {/* Invoices */}
        <div className="space-y-3">
          <p className="text-sm text-subtle font-medium">Invoices</p>
          <div className="flex flex-col gap-y-4">
            {invoices.map((inv) => (
              <Invoice
                key={inv.id}
                amount={inv.amount}
                status={inv.status}
                date={inv.date}
                downloadUrl={inv.downloadUrl}
              />
            ))}
            {invoices.length === 0 && (
              <p className="text-sm text-subtle">
                {failed
                  ? "We couldn't load your invoices right now. Please try again shortly."
                  : "No invoices yet. They'll appear here after your first payment."}
              </p>
            )}
          </div>
        </div>
        <div className="pt-4 text-center mt-auto">
          {/* Cancel / resume — only for a live subscription. Its server actions
              look up an ACTIVE row, so rendering this for an expired or free
              user would always fail with "No active subscription to cancel". */}
          {sub.state === "active" && (
            <CancelSubscriptionButton
              cancelAtPeriodEnd={sub.cancelAtPeriodEnd}
              accessUntil={nextBilling}
            />
          )}
        </div>
      </div>
    </div>
  );
}
