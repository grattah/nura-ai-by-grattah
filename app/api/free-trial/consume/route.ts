import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tryConsumeFreeView } from "@/lib/free-trial-server";
import { hasActiveSubscription, hasEverSubscribed } from "@/lib/subscription";
import { PERSONALIZED_SEARCH_SURFACE, type FreeSurface } from "@/lib/credits";

const GATED_SURFACES: string[] = [PERSONALIZED_SEARCH_SURFACE];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { allowed: false, hasEverSubscribed: false },
      { status: 401 },
    );
  }

  let surface: string;
  let itemId: string;
  try {
    ({ surface, itemId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!GATED_SURFACES.includes(surface) || !itemId?.trim()) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [activeSub, everSubscribed] = await Promise.all([
    hasActiveSubscription(supabase, user.id),
    hasEverSubscribed(supabase, user.id),
  ]);

  if (activeSub) {
    return NextResponse.json({ allowed: true, hasEverSubscribed: true });
  }
  if (everSubscribed) {
    return NextResponse.json({ allowed: false, hasEverSubscribed: true });
  }

  const allowed = await tryConsumeFreeView(
    user.id,
    surface as FreeSurface,
    itemId.trim(),
  );
  return NextResponse.json({ allowed, hasEverSubscribed: false });
}
