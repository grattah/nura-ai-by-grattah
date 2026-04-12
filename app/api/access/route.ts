import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_ATTEMPTS = 10;
const DELAY_MS = 1500;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data } = await supabase
      .from("subscriptions")
      .select("status, expires_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (data) {
      const valid = !data.expires_at || new Date(data.expires_at) > new Date();
      return NextResponse.json({ success: valid });
    }

    if (attempt < MAX_ATTEMPTS) {
      await wait(DELAY_MS);
    }
  }

  // Webhook hasn't fired yet — the user will still land on home and
  // useAccess() will re-check on mount once the session is established.
  console.warn(
    `[api/access] Subscription not found after ${MAX_ATTEMPTS} attempts for user ${userId}`,
  );
  return NextResponse.json({ success: false });
}
