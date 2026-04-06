import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// const adminSupabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// );

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  // Verify the caller is actually authenticated as this email
  // — prevents one user from claiming another user's tokens
  const supabase = await createClient();
  const adminSupabase = await createServiceRoleClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Claim all unclaimed tokens for this email
  const { error } = await adminSupabase
    .from("access_tokens")
    .update({ user_id: user.id })
    .eq("email", email)
    .is("user_id", null);

  if (error) {
    console.error("[claim] Failed to claim tokens:", error.message);
    return NextResponse.json({ error: "Claim failed" }, { status: 500 });
  }

  return NextResponse.json({ claimed: true });
}
