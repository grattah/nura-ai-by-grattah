"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

type Result = { success: true } | { error: string };

/**
 * Schedule the caller's account for deletion, stop the subscription renewing,
 * and sign them out.
 *
 * The Stripe call is `cancel_at_period_end`, never an outright cancel. That
 * choice is what makes the 30-day grace period work for a paying user:
 *
 *   • they are not billed again while the account sits scheduled for deletion;
 *   • the subscription stays live until the period they already paid for ends,
 *     so coming back inside the grace period restores real access;
 *   • it is reversible — Stripe cannot un-cancel a subscription that has
 *     actually been cancelled, so an outright cancel here would permanently
 *     destroy a subscription the user is still entitled to resume.
 *
 * Resuming is a deliberate user action on /manage-subscription, not automatic:
 * signing back in recovers the ACCOUNT, and the user then decides whether they
 * still want the plan.
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

  await stopRenewalForDeletion(user.id);

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Stop every live subscription the user has from renewing.
 *
 * Best-effort: a Stripe failure must not block the deletion request itself, and
 * the purge cron cancels outright before destroying the account anyway. Reads
 * every row with a Stripe id rather than filtering on our `status` column,
 * because that column can disagree with Stripe — a row reading 'cancelled'
 * while Stripe still bills is exactly the case that must not be missed.
 */
async function stopRenewalForDeletion(userId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .not("stripe_subscription_id", "is", null);

  const rows = (data ?? []) as { stripe_subscription_id: string | null }[];

  for (const row of rows) {
    if (!row.stripe_subscription_id) continue;
    try {
      await stripe.subscriptions.update(row.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    } catch (e) {
      // Already-cancelled subscriptions 404 — that is the desired end state.
      const status = (e as { statusCode?: number })?.statusCode;
      if (status !== 404) {
        console.error(
          `[delete-account] could not stop renewal for ${row.stripe_subscription_id}:`,
          e instanceof Error ? e.message : e,
        );
      }
    }
  }

  await admin
    .from("subscriptions")
    .update({ cancel_at_period_end: true } as never)
    .eq("user_id", userId);
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
