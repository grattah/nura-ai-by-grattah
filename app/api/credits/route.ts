import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTokenState, isLowState, type TokenState } from "@/lib/credits-server";
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
      isLow: false,
      isOut: true,
      state: EMPTY,
    });
  }

  const [activeSub, everSubscribed, state] = await Promise.all([
    hasActiveSubscription(supabase, user.id),
    hasEverSubscribed(supabase, user.id),
    getTokenState(user.id),
  ]);

  // Access holds while subscribed OR while free-trial units remain. When those
  // are exhausted the caller falls through to the paywall / lock overlay.
  const hasAccess = activeSub || state.freeRemaining > 0;

  return NextResponse.json({
    authenticated: true,
    hasAccess,
    hasEverSubscribed: everSubscribed,
    isLow: isLowState(state),
    isOut: state.totalRemaining <= 0,
    state,
  });
}
