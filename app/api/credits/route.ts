import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTokenState, isLowState, type TokenState } from "@/lib/credits-server";
import { hasActiveSubscription } from "@/lib/subscription";
import { WEEKLY_UNITS } from "@/lib/credits";

// Token state for the signed-in subscriber. Applies the rolling weekly reset
// (service-role RPC). Non-subscribers get no allowance — tokens are a subscriber
// benefit gated upstream by the paywall.

const EMPTY: TokenState = {
  weeklyUnits: WEEKLY_UNITS,
  weeklyUsed: 0,
  weeklyRemaining: WEEKLY_UNITS,
  weeklyPct: 0,
  extraPurchased: 0,
  extraUsed: 0,
  extraBalance: 0,
  extraPct: 0,
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
      isLow: false,
      isOut: true,
      state: EMPTY,
    });
  }

  const hasAccess = await hasActiveSubscription(supabase, user.id);

  if (!hasAccess) {
    return NextResponse.json({
      authenticated: true,
      hasAccess: false,
      isLow: false,
      isOut: true,
      state: EMPTY,
    });
  }

  const state = await getTokenState(user.id);
  return NextResponse.json({
    authenticated: true,
    hasAccess: true,
    isLow: isLowState(state),
    isOut: state.totalRemaining <= 0,
    state,
  });
}
