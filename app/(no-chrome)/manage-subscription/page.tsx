import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export default async function ManageSubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // limit(1), not maybeSingle(): a user may have >1 active row, which would make
  // maybeSingle() error and wrongly bounce a subscribed user to /checkout.
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status, plan, expires_at, stripe_subscription_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);
  const sub = subs?.[0];

  if (!sub) redirect("/checkout");

  const nextBilling = sub.expires_at
    ? format(new Date(sub.expires_at), "MMM d, yyyy")
    : "—";

  const planLabel = sub.plan === "monthly" ? "Monthly Plan" : "Premium Plan";
  const priceLabel = sub.plan === "monthly" ? "£7.99/month" : "£79/year";

  return (
    <div className="min-h-dvh bg-background pb-10">
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
            Manage subscription
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            You're on Nuko+ ✨
          </p>
        </div>
      </div>

      <div className="px-6 space-y-4">
        {/* Current plan card */}
        <div>
          <p className="text-sm text-subtle font-medium mb-2">Current Plan</p>
          <div className="bg-mint-green/8 rounded-xl px-4 py-5 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-[#333333CC]">
                  {planLabel}
                </p>
                <span className="text-xs bg-white text-mint-green font-semibold px-1.75 py-0.75 rounded-full">
                  Active
                </span>
              </div>
              <p className="text-base font-semibold text-mint-green">
                {priceLabel}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#333333CC]">Next billing date</p>
              <p className="text-sm font-semibold text-mint-green">
                {nextBilling}
              </p>
            </div>
          </div>
        </div>

        {/* Change plan */}
        <Link
          href="/change-plan"
          className="flex items-center justify-between px-6 py-6 bg-[#E8E6DC] rounded-xl border border-[#E8E6DC] hover:opacity-80 transition-opacity active:scale-[0.98]"
        >
          <p className="text-base font-medium text-[#333333CC]">
            Change Plan
          </p>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>

        {/* Support */}
        <div className="pt-4 text-center mt-18">
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
  );
}
