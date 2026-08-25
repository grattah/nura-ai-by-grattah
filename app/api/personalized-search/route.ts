import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runPersonalizedSearch } from "@/lib/personalized-search-server";

// Type re-export for existing importers.
export type { PersonalizedSearchResult } from "@/lib/personalized-search-server";

export const maxDuration = 30;

// Kept for compatibility; the personalized-search page now generates server-side
// (no caching, on the fly) via the same shared helper.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query: string;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const outcome = await runPersonalizedSearch(supabase, user.id, query);
  switch (outcome.status) {
    case "ok":
      return NextResponse.json(outcome.result);
    case "blocked":
      return NextResponse.json(
        { error: "Subscription required" },
        { status: 403 },
      );
    case "out_of_tokens":
      return NextResponse.json(
        { error: "insufficient_tokens" },
        { status: 402 },
      );
    default:
      return NextResponse.json(
        { error: "Failed to generate response" },
        { status: 500 },
      );
  }
}
