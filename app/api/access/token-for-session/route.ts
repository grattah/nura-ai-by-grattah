import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { stripeSessionId } = await req.json();
  const supabase = await createServiceRoleClient();

  const { data } = await supabase
    .from("access_tokens")
    .select("token")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle();

  return NextResponse.json({ token: data?.token ?? null });
}
