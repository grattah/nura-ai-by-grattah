import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The signed-in user's id, read from the verified session.
 *
 * Client components used to take this as a `userId` prop from their server
 * parent. RLS was always the real boundary — every table these components touch
 * restricts rows to `auth.uid()` — but the prop is baked into the RSC payload at
 * render time, so it goes stale the moment the session changes in another tab,
 * and the resulting query quietly returns nothing (or, for the avatar upload,
 * fails a storage policy with an opaque error). Reading the session instead
 * keeps the id current and stops the code reading as though the browser is
 * trusted to say who it is.
 */
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
