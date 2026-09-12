"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

type Result = { success: true } | { error: string };

/** Schedules deletion, stops renewal, and signs the user out. */
export async function scheduleAccountDeletion(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createServiceRoleClient();
  // ignoreDuplicates keeps the original scheduled_at so a repeat request can't extend the grace period.
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
