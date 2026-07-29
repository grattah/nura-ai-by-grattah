"use server"

import { createClient } from "@/lib/supabase/server";

const DEDUPE_WINDOW_MS = 60 * 60 * 1000; // 1 hour — matches actions/activity.ts

/**
 * Records a search twice, for two different purposes:
 *
 *  • `search_logs` — popularity analytics. Deliberately ONE-WORD, lowercased:
 *    that's what distinct-user concern ranking wants.
 *  • `activities`  — the user's own feed ("You searched …"). Keeps the term as
 *    typed, multi-word included, because the feed is a record of what the user
 *    actually did.
 *
 * Both are best-effort; a logging failure never surfaces to the caller.
 */
export async function logSearch(rawTerm: string): Promise<void> {
  const term = rawTerm.trim();
  if (!term) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anonymous searches aren't counted toward distinct-user popularity,
  // since we can't attribute them to a person.
  if (!user) return;

  const analyticsTerm = term.toLowerCase();
  // One-word concerns only, per the goal.
  if (!/\s/.test(analyticsTerm)) {
    const { error } = await supabase
      .from("search_logs")
      .insert({ term: analyticsTerm, user_id: user.id });
    if (error) console.error("Failed to log search:", error);
  }

  // Feed row, deduped like the other activity writers so repeating a search
  // doesn't stack identical entries.
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
