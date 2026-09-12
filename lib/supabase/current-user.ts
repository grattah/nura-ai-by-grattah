import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCurrentUserId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    console.error("[current-user] could not read claims:", error.message);
    return null;
  }
  return data?.claims?.sub ?? null;
}
