import { createServiceRoleClient } from "@/lib/supabase/server";
import { secureCompare } from "@/lib/secure-compare";
import { stripe } from "@/lib/stripe";
import {
  DELETION_GRACE_DAYS,
  isPastGracePeriod,
  signedInSinceScheduling,
} from "@/lib/account-deletion";

export const maxDuration = 60;

/** Deletes accounts past the 30-day grace period and restores those who signed back in. */
export async function GET(req: Request) {
  if (
    !secureCompare(
      req.headers.get("authorization"),
      `Bearer ${process.env.CRON_SECRET}`,
    )
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createServiceRoleClient();
  const now = new Date();

  // Safety net: sync subscription status in case webhook events were missed.
  let subscriptionsExpired = 0;
  {
    const { data, error } = await admin.rpc(
      "expire_lapsed_subscriptions" as never,
    );
    if (error) {
      console.error("[purge-deleted-accounts] expire sweep failed:", error.message);
    } else {
      subscriptionsExpired = (data as number | null) ?? 0;
    }
  }

  let balancesLapsed = 0;
  {
    const { data, error } = await admin.rpc("lapse_expired_balances" as never);
    if (error) {
      console.error("[purge-deleted-accounts] lapse sweep failed:", error.message);
    } else {
      balancesLapsed = (data as number | null) ?? 0;
    }
  }

  const { data, error } = await admin
    .from("account_deletions")
    .select("user_id, scheduled_at")
    .order("scheduled_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error("[purge-deleted-accounts] query failed:", error.message);
    return new Response("Query failed", { status: 500 });
  }

  const rows = (data ?? []) as { user_id: string; scheduled_at: string }[];

  let deleted = 0;
  let reactivated = 0;
  let skipped = 0;

  for (const row of rows) {
    const { data: userData, error: userErr } =
      await admin.auth.admin.getUserById(row.user_id);

    if (userErr || !userData?.user) {
      await admin.from("account_deletions").delete().eq("user_id", row.user_id);
      skipped++;
      continue;
    }

    if (
      signedInSinceScheduling(row.scheduled_at, userData.user.last_sign_in_at)
    ) {
      await admin.from("account_deletions").delete().eq("user_id", row.user_id);
      reactivated++;
      continue;
    }

    if (!isPastGracePeriod(row.scheduled_at, now)) {
      skipped++;
      continue;
    }

    const { data: subs } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", row.user_id)
      .not("stripe_subscription_id", "is", null);

    let stripeFailed = false;
    for (const sub of (subs ?? []) as {
      stripe_subscription_id: string | null;
    }[]) {
      if (!sub.stripe_subscription_id) continue;
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } catch (e) {
        const code = (e as { code?: string; statusCode?: number })?.statusCode;
        if (code !== 404) {
          console.error(
            `[purge-deleted-accounts] Stripe cancel failed for ${row.user_id}:`,
            e instanceof Error ? e.message : e,
          );
          stripeFailed = true;
        }
      }
    }

    if (stripeFailed) {
      skipped++;
      continue;
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(row.user_id);
    if (delErr) {
      console.error(
        `[purge-deleted-accounts] deleteUser failed for ${row.user_id}:`,
        delErr.message,
      );
      skipped++;
      continue;
    }
    deleted++;
  }

  return Response.json({
    graceDays: DELETION_GRACE_DAYS,
    subscriptionsExpired,
    balancesLapsed,
    scanned: rows.length,
    deleted,
    reactivated,
    skipped,
  });
}
