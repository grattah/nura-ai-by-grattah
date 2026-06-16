import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBalance } from "@/lib/credits-server";
import { LOW_THRESHOLD } from "@/lib/credits";

// Current credit balance for the signed-in subscriber. Applies the idempotent
// daily grant (service-role RPC) so the first load of a new day tops up. Non-
// subscribers get no grant — credits are a subscriber benefit gated upstream.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      hasAccess: false,
      balance: 0,
      isLow: false,
    });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  const hasAccess =
    !!sub && (!sub.expires_at || new Date(sub.expires_at) > new Date());

  if (!hasAccess) {
    return NextResponse.json({
      authenticated: true,
      hasAccess: false,
      balance: 0,
      isLow: false,
    });
  }

  const balance = await getBalance(user.id);
  return NextResponse.json({
    authenticated: true,
    hasAccess: true,
    balance,
    isLow: balance <= LOW_THRESHOLD,
  });
}
