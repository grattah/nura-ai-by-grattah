"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

type Result = { success: true } | { error: string };

/**
 * Schedule the caller's account for deletion and sign them out.
 *
 * Nothing is destroyed here and no Stripe call is made — per the product copy
 * ("If you don't [sign back in], your subscription will be cancelled and your
 * account will be permanently deleted"), both happen when the grace period
 * lapses, in app/api/cron/purge-deleted-accounts. That keeps this step fully
 * reversible: recovery is a single row delete, with no Stripe state to unwind.
 *
 * Writes go through the service role: account_deletions has no client
 * insert/update policy, so a user can't schedule anyone else's deletion.
 */
export async function scheduleAccountDeletion(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createServiceRoleClient();
  // Upsert, not insert: re-requesting deletion must not fail on the primary key.
  // `ignoreDuplicates` keeps the ORIGINAL scheduled_at so a second request can't
  // be used to extend the grace period indefinitely.
  const { error } = await admin
    .from("account_deletions")
    .upsert({ user_id: user.id } as never, {
      onConflict: "user_id",
      ignoreDuplicates: true,
    });

  if (error) {
    console.error("[delete-account] schedule failed:", error.message);
    return { error: "Couldn't schedule the deletion. Please try again." };
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Cancel a pending deletion — "sign in within 30 days and your account comes
 * back". Called from every sign-in path; safe and cheap to call when no request
 * exists (the delete simply matches no rows).
 *
 * This is not the only guard: purge-deleted-accounts independently compares
 * `auth.users.last_sign_in_at` against `scheduled_at`, so an un-hooked sign-in
 * path can't cause a recovered account to be destroyed.
 */
export async function cancelScheduledDeletion(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await createServiceRoleClient()
    .from("account_deletions")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("[delete-account] cancel failed:", error.message);
  }
}

/** Whether the signed-in user has a pending deletion request. */
export async function getScheduledDeletion(): Promise<{
  scheduledAt: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("account_deletions")
    .select("scheduled_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const row = data as { scheduled_at: string } | null;
  return row ? { scheduledAt: row.scheduled_at } : null;
}
