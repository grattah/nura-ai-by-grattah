import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (record.count >= 5) return true;
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

  // Query auth schema directly — O(1) vs listUsers() O(n)
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "auth" } },
  );

  try {
    await new Promise((r) => setTimeout(r, 200)); // timing-attack mitigation

    // const { data } = await authClient
    //   .from("users")
    //   .select("id, identities")
    //   .eq("email", email.toLowerCase())
    //   .maybeSingle();

    const { data: users } = await authClient.auth.admin.listUsers();
    const data = users.users.find(
      (user) => user.email?.toLocaleLowerCase() === email.toLowerCase(),
    );

    if (!data) {
      return NextResponse.json({ exists: false, hasPassword: false });
    }

    // Identities don't reliably tell us whether a password is set — OTP-based
    // sign-in also creates an "email" identity. Instead, `has_password` is
    // explicitly stamped onto user_metadata whenever a password is created
    // or changed (see actions/profile.ts, auth-form.tsx, update-password-form.tsx).
    const hasPassword = data.user_metadata?.has_password === true;

    return NextResponse.json({ exists: true, hasPassword });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
