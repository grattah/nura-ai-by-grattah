import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_ATTEMPTS = 10;
const DELAY_MS = 1500; // wait 1.5s between attempts = up to 15s total

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  const { stripeSessionId } = await req.json();

  if (!stripeSessionId) {
    return NextResponse.json({ token: null }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  console.log(
    "[token-for-session] Key length:",
    process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
  );

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from("access_tokens")
      .select("token")
      .eq("stripe_session_id", stripeSessionId)
      .maybeSingle();

    console.log(`[token-for-session] Attempt ${attempt}:`, { data, error });

    if (data?.token) {
      return NextResponse.json({ token: data.token });
    }

    // Don't wait after the last attempt
    if (attempt < MAX_ATTEMPTS) {
      await wait(DELAY_MS);
    }
  }

  console.error(
    `[token-for-session] Token not found after ${MAX_ATTEMPTS} attempts for session:`,
    stripeSessionId,
  );
  return NextResponse.json({ token: null });
}
