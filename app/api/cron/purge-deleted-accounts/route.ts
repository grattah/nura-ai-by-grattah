import { createServiceRoleClient } from "@/lib/supabase/server";
import { secureCompare } from "@/lib/secure-compare";
import { stripe } from "@/lib/stripe";
import {
  DELETION_GRACE_DAYS,
  isPastGracePeriod,
  signedInSinceScheduling,
} from "@/lib/account-deletion";

export const maxDuration = 60;

/**
 * Permanently deletes accounts whose 30-day grace period has lapsed, and
 * reactivates any that signed back in.
 *
 * Deliberately conservative: a row is only destroyed when the grace period has
 * lapsed AND `auth.users.last_sign_in_at` shows no sign-in since the request.
 * That second check is GoTrue's own bookkeeping, so it holds even if a sign-in
 * path forgets to call cancelScheduledDeletion(). Anything uncertain (missing
 * auth user, Stripe failure) is skipped and retried on the next run rather than
 * deleted.
 */
export async function GET(req: Request) {
  // Constant-time compare (audit S4), same as clean-up-ghosts.
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

  // Safety net for subscription status. The webhook keeps status current when
  // events arrive, but they can be missed (they were, for a month, while the
  // endpoint pointed at the retired domain) — and a missed event left rows
  // reading "active" long past expires_at. Cheap, idempotent, runs first so a
  // later failure in the purge below doesn't skip it.
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

  // Spec §7 — subscription units die at period end and purchased units freeze.
  // Runs beside the expiry sweep above because it depends on it: a row must be
  // out of its paid period before its balance is lapsed.
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

    // No auth user: the account is already gone and the cascade should have taken
    // this row with it. Clear the orphan rather than looping on it forever.
    if (userErr || !userData?.user) {
      await admin.from("account_deletions").delete().eq("user_id", row.user_id);
      skipped++;
      continue;
    }

    // They came back — cancel the request regardless of how long it's been.
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

    // Cancel any live Stripe subscription IMMEDIATELY (not at period end) — the
    // account is about to stop existing, so there's nothing left to bill for.
    //
    // Every row with a Stripe id is attempted, NOT just the ones our `status`
    // column calls 'active'. That column can disagree with Stripe (prod has
    // rows reading 'cancelled' against subscriptions Stripe still reports as
    // active), and filtering on it would leave a deleted user's card being
    // charged forever. Cancelling an already-cancelled subscription 404s, which
    // is handled below, so the wider net costs nothing.
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
        // Already-cancelled subscriptions 404 — that's the desired end state.
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

    // Never destroy an account while it might still be billable. Retry next run.
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
    // The FK cascade removes the account_deletions row with the auth user.
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
