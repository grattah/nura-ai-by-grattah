"use server"

import { createClient } from "@/lib/supabase/server";

const DEDUPE_WINDOW_MS = 60 * 60 * 1000;

/** Records a search for analytics (search_logs) and the activity feed. */
export async function logSearch(rawTerm: string): Promise<void> {
  const term = rawTerm.trim();
  if (!term) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const analyticsTerm = term.toLowerCase();
  if (!/\s/.test(analyticsTerm)) {
    const { error } = await supabase
      .from("search_logs")
      .insert({ term: analyticsTerm, user_id: user.id });
    if (error) console.error("Failed to log search:", error);
  }

  const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
  const { data: recent } = await supabase
    .from("activities")
    .select("id")
    .eq("user_id", user.id)
    .eq("action", "searched")
    .eq("label", term)
    .gte("created_at", cutoff)
    .maybeSingle();
  if (recent) return;

  const { error: activityError } = await supabase
    .from("activities")
    .insert({ user_id: user.id, action: "searched", label: term });
  if (activityError) {
    console.error("Failed to log search activity:", activityError);
  }
}
