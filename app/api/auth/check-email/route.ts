// /app/api/auth/check-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Simple in-memory rate limiter
// Replace with Upstash Ratelimit in production:
// npm i @upstash/ratelimit @upstash/redis
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxAttempts = 5;

  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (record.count >= maxAttempts) return true;

  record.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const body = await req.json();
  const email = body?.email;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Admin client — uses service role key, server-side only
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // const { data, error } = await supabase.auth.admin.getUserByEmail(
    //   email.toLowerCase(),
    // );
    const { data } = await supabase
      .from("auth.users")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    // Add a small artificial delay to deter timing-based enumeration
    await new Promise((resolve) => setTimeout(resolve, 200));

    // If error code is 'user_not_found' the email is new — otherwise it exists
    const exists = !!data;
    // const exists = !error && !!data?.user;

    return NextResponse.json({ exists });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
