"use server"

import { createClient } from "@/lib/supabase/server";

export async function logSearch(rawTerm: string): Promise<void> {
  const term = rawTerm.trim().toLowerCase();

  // One-word concerns only, per the goal.
  if (!term || /\s/.test(term)) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anonymous searches aren't counted toward distinct-user popularity,
  // since we can't attribute them to a person.
  if (!user) return;

  const { error } = await supabase
    .from("search_logs")
    .insert({ term, user_id: user.id });

  if (error) console.error("Failed to log search:", error);
}