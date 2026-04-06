import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { token } = await req.json();

  if (!token || typeof token !== "string") {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("access_tokens")
    .select("status, expires_at")
    .eq("token", token)
    .eq("status", "active")
    .maybeSingle();

  const valid =
    !!data && (!data.expires_at || new Date(data.expires_at) > new Date());

  const res = NextResponse.json({ valid });

  if (valid) {
    // Set HttpOnly cookie so middleware can check access at the edge
    res.cookies.set("nura_access_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  }

  return res;
}
