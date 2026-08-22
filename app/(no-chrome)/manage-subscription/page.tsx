import { PLANS, PLAN_LABELS, type Plan } from "@/constants";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { getSubscriptionView } from "@/lib/subscription-state";
import { getFreeTrialTokens } from "@/lib/free-trial-server";
import { FreeTrialExhaustedGate } from "@/components/subscription/free-trial-exhausted-gate";
import { CancelSubscriptionButton } from "@/components/subscription/cancel-subscription-button";

export default async function ManageSubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // No redirect: expired and never-subscribed users get their own card states.
  const sub = await getSubscriptionView(supabase, user.id);
  const isFree = sub.state === "free";
  const isExpired = sub.state === "expired";
  const trial = isFree ? await getFreeTrialTokens(user.id) : null;

  // A cancelled plan is still live until expiresAt, but it will never bill
  // again — so there is no "next billing date" to show. Showing the period end
  // there read as an upcoming charge.
  const isCancelled = sub.cancelAtPeriodEnd && !isExpired;
  const accessUntil = sub.expiresAt
    ? format(new Date(sub.expiresAt), "MMM d, yyyy")
    : null;
  const dated = isCancelled ? "—" : (accessUntil ?? "—");

  // Derived from constants/index.ts so a price change lands everywhere at once.
  const planEntry = PLANS.find((p) => p.id === sub.plan);
  const planLabel = isFree
    ? "Free Plan"
    : (PLAN_LABELS[sub.plan as Plan]?.name ?? "Premium Plan");
  const priceLabel =
    isFree || !planEntry ? `` : `${planEntry.price} ${planEntry.per}`;

  // Expired reuses the card layout with the error palette; free plan has no
  // billing date to show.
  const alert = isExpired || isCancelled;
  const cardClass = alert ? "bg-[#DC23231A]" : "bg-mint-green/8";
  const pillClass = alert
    ? "text-xs bg-white text-[#DC2323] font-semibold px-1.75 py-0.75 rounded-full"
    : "text-xs bg-white text-mint-green font-semibold px-1.75 py-0.75 rounded-full";
  const valueClass = alert
    ? "text-base font-semibold text-[#DC2323]"
    : "text-base font-semibold text-mint-green";
  const rowValueClass = alert
    ? "text-sm font-semibold text-[#DC2323]"
    : "text-sm font-semibold text-mint-green";
  const statusLabel = isExpired
    ? "Expired"
    : isCancelled
      ? "Cancelled"
      : "Active";

  return (
    <FreeTrialExhaustedGate exhausted={!!trial?.exhausted}>
      <div className="min-h-dvh bg-background pb-10 flex flex-col">
        {/* Header */}
        <div className="flex items-center px-6 pt-5 pb-10 relative">
          <Link
            href="/account"
            className="size-10 absolute left-4 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
            aria-label="Back"
          >
            <ArrowLeft className="size-5 text-foreground" />
          </Link>

          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-xl font-semibold text-foreground">
              Membership
            </h1>
            {sub.plan && (
              <p className="text-sm text-muted-foreground mt-1">
                You're on Nuko+ ✨
              </p>
            )}
          </div>
        </div>

        <div className="px-6 space-y-4 flex flex-col flex-1">
          {/* Current plan card */}
          <div>
            <p className="text-sm text-subtle font-medium mb-2">Current Plan</p>
            <div className={`${cardClass} rounded-xl px-4 py-5 space-y-3`}>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-[#333333CC]">
                    {planLabel}
                  </p>
                  <span className={pillClass}>{statusLabel}</span>
                </div>
                <p className={valueClass}>{priceLabel}</p>
              </div>
              {sub.plan && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#333333CC]">
                    {isExpired ? "Expired on" : "Next billing date"}
                  </p>
                  {/* A free plan has no billing date. */}
                  <p className={rowValueClass}>{dated}</p>
                </div>
              )}
            </div>
          </div>

          {/* Change plan */}
          <Link
            href="/change-plan"
            className="flex items-center justify-between p-4 bg-[#E8E6DC] rounded-xl border border-[#E8E6DC] hover:opacity-80 transition-opacity active:scale-[0.98]"
          >
            <p className="text-base font-medium text-[#333333CC]">
              Change Plan
            </p>
            <ChevronRight className="size-4.5 text-muted-foreground" />
          </Link>
          <Link
            href="/billing-history"
            className="flex items-center justify-between p-4 bg-[#E8E6DC] rounded-xl border border-[#E8E6DC] hover:opacity-80 transition-opacity active:scale-[0.98]"
          >
            <p className="text-base font-medium text-[#333333CC]">Billing</p>
            <ChevronRight className="size-4.5 text-muted-foreground" />
          </Link>

          {/* Cancel / resume. Both server actions look up an ACTIVE row, so
              this is only meaningful while the subscription is live. For a
              cancelled-but-unexpired plan it renders the "set to cancel"
              banner with the access-until date, plus Resume. */}
          {sub.state === "active" && (
            <div className="pt-2">
              <CancelSubscriptionButton
                cancelAtPeriodEnd={sub.cancelAtPeriodEnd}
                accessUntil={accessUntil ?? "—"}
              />
            </div>
          )}

          {/* Support */}
          <div className="pt-4 text-center mt-auto">
            <p className="text-base text-grey-c500">
              Need help?{" "}
              <a
                href="mailto:support@nuko.app"
                className="font-semibold text-mint-green"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </FreeTrialExhaustedGate>
  );
}
