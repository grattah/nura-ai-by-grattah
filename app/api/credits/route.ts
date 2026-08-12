import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTokenState, isLowState, type TokenState } from "@/lib/credits-server";
import { getFreeTrialTokens } from "@/lib/free-trial-server";
import { hasActiveSubscription, hasEverSubscribed } from "@/lib/subscription";
import { WEEKLY_UNITS } from "@/lib/credits";

// Token wallet for the signed-in user. Applies the rolling weekly reset
// (service-role RPC). Access = active subscription OR unspent free-trial units;
// weeklyRemaining is 0 for non-subscribers (gated in token_state_json), so a
// trial user's balance is just their free bucket.

const EMPTY: TokenState = {
  weeklyUnits: WEEKLY_UNITS,
  weeklyUsed: 0,
  weeklyRemaining: WEEKLY_UNITS,
  weeklyPct: 0,
  extraPurchased: 0,
  extraUsed: 0,
  extraBalance: 0,
  extraPct: 0,
  freeGranted: 0,
  freeUsed: 0,
  freeRemaining: 0,
  totalRemaining: 0,
  resetAt: null,
  lastPurchaseAt: null,
};

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
      isLow: false,
      isOut: true,
      state: EMPTY,
    });
  }

  const [activeSub, everSubscribed] = await Promise.all([
    hasActiveSubscription(supabase, user.id),
    hasEverSubscribed(supabase, user.id),
  ]);

  // Global access = active subscriber OR a brand-new user still in their free
  // trial; per-surface caps are enforced at the surfaces. Token state is a
  // subscriber concept (buy-tokens UI) — new users get EMPTY.
  const hasAccess = activeSub || !everSubscribed;
  const state = activeSub ? await getTokenState(user.id) : EMPTY;
  // Only meaningful for a brand-new (never-subscribed) user: have they used up
  // every free trial across all gated surfaces? Subscribers and lapsed
  // subscribers don't have a "free trial" to exhaust.
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
    isLow: activeSub ? isLowState(state) : false,
    isOut: activeSub ? state.totalRemaining <= 0 : false,
    state,
  });
}
