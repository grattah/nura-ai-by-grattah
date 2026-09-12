import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

interface EmailStatus {
  exists: boolean;
  hasPassword: boolean;
}

/** Looks up a user by email via a SECURITY DEFINER RPC. */
async function lookupViaRpc(
  admin: ReturnType<typeof createServiceRoleClient>,
  email: string,
): Promise<EmailStatus | null> {
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

/** Fallback lookup that pages through every user. */
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
    await new Promise((r) => setTimeout(r, 200));

    const status =
      (await lookupViaRpc(admin, normalized)) ??
      (await lookupViaListUsers(admin, normalized));

    return NextResponse.json(status);
  } catch (err) {
    console.error("[check-email]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
