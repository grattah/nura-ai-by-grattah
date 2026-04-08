import { type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { contextId, contextType, questions } = await req.json();

  if (!contextId || !contextType || !Array.isArray(questions)) {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
    });
  }

  const supabase = createServiceRoleClient();
  const table = contextType === "recipe" ? "recipes" : "guides";

  const { error } = await supabase
    .from(table)
    .update({ follow_up_questions: questions })
    .eq("id", contextId);

  if (error) {
    console.error("[save-questions]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
