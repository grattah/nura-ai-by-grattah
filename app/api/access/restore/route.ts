import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Basic in-memory rate limit — swap for Upstash Redis in production
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  if (record.count >= 3) return true; // max 3 restore attempts per minute

  record.count++;
  return false;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Look up the most recent active token for this email
  const { data: tokenRow } = await supabase
    .from("access_tokens")
    .select("token")
    .eq("email", email.toLowerCase().trim())
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tokenRow?.token) {
    // Always return 404 — don't leak whether the email exists at all
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 },
    );
  }

  // Send the restore email
  // TODO: swap console.log for Resend/Postmark
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const restoreUrl = `${appUrl}/restore?token=${tokenRow.token}`;

  console.log(`[restore] Sending restore link to ${email}: ${restoreUrl}`);

  // await resend.emails.send({
  //   from: "nura@yourdomain.com",
  //   to: email,
  //   subject: "Your Nura access link",
  //   html: `
  //     <p>Here's your access link for Nura:</p>
  //     <p><a href="${restoreUrl}">Restore my access</a></p>
  //     <p>Or copy your token: <code>${tokenRow.token}</code></p>
  //     <p>This link will restore access on any device.</p>
  //   `,
  // });

  return NextResponse.json({ sent: true });
}
