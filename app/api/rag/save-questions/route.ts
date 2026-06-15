import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  contextId: z.string().uuid(),
  contextType: z.enum(["recipe", "guide"]),
  questions: z.array(z.string().trim().min(1).max(200)).min(1).max(8),
});

export async function POST(req: NextRequest) {
  // 1. Require an authenticated user.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate the payload.
  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { contextId, contextType, questions } = parsed;
  const table = contextType === "recipe" ? "recipes" : "guides";

  // 3. Fill-once: only write when no questions are cached yet. This closes the
  //    arbitrary-overwrite (IDOR) hole while preserving the caching behaviour.
  const admin = createServiceRoleClient();

  const { data: existing, error: readError } = await admin
    .from(table)
    .select("id, follow_up_questions")
    .eq("id", contextId)
    .maybeSingle();

  if (readError) {
    console.error("[save-questions] read", readError);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const current = existing.follow_up_questions;
  if (Array.isArray(current) && current.length > 0) {
    // Already cached — treat as success, do not overwrite.
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error: updateError } = await admin
    .from(table)
    .update({ follow_up_questions: questions })
    .eq("id", contextId);

  if (updateError) {
    console.error("[save-questions] update", updateError);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
