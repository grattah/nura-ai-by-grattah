import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

interface EmailStatus {
  exists: boolean;
  hasPassword: boolean;
}

// Primary path: a SECURITY DEFINER function (see
// supabase/migrations/*_check_email_status_fn.sql) does an indexed O(1) lookup
// on auth.users without exposing the auth schema. Returns null if the function
// isn't deployed yet so the caller can fall back.
async function lookupViaRpc(
  admin: ReturnType<typeof createServiceRoleClient>,
  email: string,
): Promise<EmailStatus | null> {
  // The function lives in the (exposed) public schema; the typed client doesn't
  // know it, so call through an untyped view of rpc().
  const { data, error } = await (
    admin.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: { account_exists: boolean; has_password: boolean }[] | null;
      error: { code?: string } | null;
    }>
  )("check_email_status", { p_email: email });

  if (error) return null; // function missing / not migrated yet → fall back
  const row = data?.[0];
  if (!row) return { exists: false, hasPassword: false };
  return { exists: true, hasPassword: row.has_password === true };
}

// Fallback path: page through ALL users (admin.listUsers defaults to the first
// page only — audit finding H2). Correct but O(n); used only until the RPC
// migration is applied.
async function lookupViaListUsers(
  admin: ReturnType<typeof createServiceRoleClient>,
  email: string,
): Promise<EmailStatus> {
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) {
      return {
        exists: true,
        hasPassword: match.user_metadata?.has_password === true,
      };
    }
    if (data.users.length < perPage) return { exists: false, hasPassword: false };
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  // Durable, cross-instance limit (audit H1/H3): 5 lookups / minute / IP.
  const { success } = await rateLimit(`check-email:${ip}`, 5, 60_000);
  if (!success) {
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
  const normalized = email.toLowerCase();

  const admin = createServiceRoleClient();

  try {
    await new Promise((r) => setTimeout(r, 200)); // timing-attack mitigation

    const status =
      (await lookupViaRpc(admin, normalized)) ??
      (await lookupViaListUsers(admin, normalized));

    return NextResponse.json(status);
  } catch (err) {
    console.error("[check-email]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
