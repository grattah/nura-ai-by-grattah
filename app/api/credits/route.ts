import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBalances } from "@/lib/tokens/server";
import { getFreeTrialTokens } from "@/lib/free-trial-server";
import { hasActiveSubscription, hasEverSubscribed } from "@/lib/subscription";
import { walletSnapshot, EMPTY_WALLET } from "@/lib/tokens/spec";
import type { Plan } from "@/constants";

// The signed-in user's wallet (spec §1) — two independent balances, both read
// in units and converted to tokens only here, at the display boundary.
//
// Access = an active subscription OR an unspent free trial. A lapsed subscriber
// keeps their purchased balance, but it reports as frozen so the UI can say so
// rather than showing spendable tokens the user cannot actually use.

interface CreditsRow {
  plan: string | null;
  next_allocation_at: string | null;
  last_purchase_at: string | null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      hasAccess: false,
      hasEverSubscribed: false,
      isSubscriber: false,
      trialExhausted: false,
      isOut: true,
      wallet: EMPTY_WALLET,
    });
  }

  const [activeSub, everSubscribed] = await Promise.all([
    hasActiveSubscription(supabase, user.id),
    hasEverSubscribed(supabase, user.id),
  ]);

  const [balances, { data: row }] = await Promise.all([
    getBalances(user.id),
    supabase
      .from("credits")
      .select("plan, next_allocation_at, last_purchase_at")
      .eq("user_id", user.id)
      .maybeSingle<CreditsRow>(),
  ]);

  const wallet = walletSnapshot({
    balances,
    plan: (row?.plan as Plan | null) ?? null,
    nextAllocationAt: row?.next_allocation_at ?? null,
    lastPurchaseAt: row?.last_purchase_at ?? null,
  });

  // Global access; per-surface caps are enforced at the surfaces themselves.
  const hasAccess = activeSub || !everSubscribed;

  // Only meaningful for a brand-new user: lapsed subscribers have no trial to
  // exhaust, they have a frozen balance.
  const trialExhausted =
    !activeSub && !everSubscribed
      ? (await getFreeTrialTokens(user.id)).exhausted
      : false;

  return NextResponse.json({
    authenticated: true,
    hasAccess,
    hasEverSubscribed: everSubscribed,
    isSubscriber: activeSub,
    trialExhausted,
    // "Out" means the cheapest action is unaffordable — frozen purchased
    // tokens do not count toward this, since they cannot be spent.
    isOut: activeSub ? !wallet.canSpend : false,
    wallet,
  });
}
