import { describe, it, expect } from "vitest";
import { withRollback, makeUser, hasTestDb, type Tx } from "../helpers/db";

// QA: "Subscription expiry shows no expired status on the DB — it still stores
//      as active even after expiry", and
//     "Check that user's database status is correct after expiry, cancellation
//      or renewal."
//
// Both are the same question asked three ways, so they are one suite. These run
// the real sweep function against real rows: the bug was that nothing ever
// moved a lapsed row off 'active', and a mocked client cannot show that because
// the mock returns whatever status the test author typed.

const d = hasTestDb ? describe : describe.skip;

/**
 * `offset` is an interval like '-1 day' or '20 days', applied to now() IN SQL.
 * A parameter is a value, never an expression — passing "now() - interval
 * '1 day'" as $4 sends that text to the timestamp parser, which rejects it.
 */
const addSub = (
  tx: Tx,
  userId: string,
  status: string,
  offset: string,
  plan = "monthly",
) =>
  tx.sql(
    `insert into public.subscriptions (user_id, plan, status, expires_at)
     values ($1::uuid, $2, $3, now() + $4::interval)`,
    [userId, plan, status, offset],
  );

const statusOf = async (tx: Tx, userId: string) =>
  (
    await tx.sql<{ status: string }>(
      "select status from public.subscriptions where user_id = $1::uuid",
      [userId],
    )
  )[0]?.status;

d("subscription status after expiry", () => {
  it("moves a lapsed 'active' row to expired", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await addSub(tx, user, "active", "-1 day");

      expect(await statusOf(tx, user)).toBe("active");
      await tx.sql("select public.expire_lapsed_subscriptions()");
      expect(await statusOf(tx, user)).toBe("expired");
    });
  });

  it("leaves a subscription that is still inside its period alone", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await addSub(tx, user, "active", "10 days");

      await tx.sql("select public.expire_lapsed_subscriptions()");
      expect(await statusOf(tx, user)).toBe("active");
    });
  });

  it("is idempotent — a second sweep changes nothing", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await addSub(tx, user, "active", "-1 day");

      const first = await tx.sql<{ expire_lapsed_subscriptions: number }>(
        "select public.expire_lapsed_subscriptions()",
      );
      const second = await tx.sql<{ expire_lapsed_subscriptions: number }>(
        "select public.expire_lapsed_subscriptions()",
      );

      expect(first[0].expire_lapsed_subscriptions).toBeGreaterThan(0);
      expect(second[0].expire_lapsed_subscriptions).toBe(0);
    });
  });
});

// has_active_subscription() takes NO arguments — it resolves auth.uid() itself,
// because its purpose is to be callable from an RLS policy. It therefore has to
// be invoked AS the user; calling it as the connection owner returns false for
// everyone, which would make these tests pass for the wrong reason.
const entitled = async (tx: Tx, userId: string) =>
  (
    await tx.asUser<{ ok: boolean }>(
      userId,
      "select public.has_active_subscription() as ok",
    )
  )[0].ok;

d("entitlement survives cancellation until the period ends", () => {
  it("keeps a cancelled-but-unexpired user entitled", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      // Cancelling in Stripe writes 'cancelled' immediately, but the user has
      // paid through expires_at and must keep access until then.
      await addSub(tx, user, "cancelled", "20 days");

      expect(
        await entitled(tx, user),
        "cancelled in-period must stay entitled",
      ).toBe(true);
    });
  });

  it("drops entitlement once the paid period has passed", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await addSub(tx, user, "cancelled", "-1 day");

      expect(await entitled(tx, user)).toBe(false);
    });
  });

  it("does not entitle a user with no subscription at all", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      expect(await entitled(tx, user)).toBe(false);
    });
  });
});

d("token balances follow the subscription (spec §7)", () => {
  it("zeroes subscription units and freezes purchased when the period ends", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await addSub(tx, user, "active", "-1 day");
      await tx.sql(
        `insert into public.credits (user_id, subscription_units, purchased_units, purchased_frozen)
         values ($1::uuid, 40, 130, false)`,
        [user],
      );

      await tx.sql("select public.lapse_expired_balances()");

      const [row] = await tx.sql<{
        subscription_units: number;
        purchased_units: number;
        purchased_frozen: boolean;
      }>(
        `select subscription_units, purchased_units, purchased_frozen
           from public.credits where user_id = $1::uuid`,
        [user],
      );

      expect(row.subscription_units, "subscription tokens die at period end").toBe(0);
      // §7 is explicit: frozen is a FLAG, never a deletion. Destroying paid
      // value invites chargebacks.
      expect(row.purchased_units, "purchased tokens must be retained").toBe(130);
      expect(row.purchased_frozen).toBe(true);
    });
  });

  it("leaves an in-period user's balance untouched", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await addSub(tx, user, "cancelled", "5 days");
      await tx.sql(
        `insert into public.credits (user_id, subscription_units, purchased_units, purchased_frozen)
         values ($1::uuid, 40, 130, false)`,
        [user],
      );

      await tx.sql("select public.lapse_expired_balances()");

      const [row] = await tx.sql<{
        subscription_units: number;
        purchased_frozen: boolean;
      }>(
        "select subscription_units, purchased_frozen from public.credits where user_id = $1::uuid",
        [user],
      );
      expect(row.subscription_units).toBe(40);
      expect(row.purchased_frozen).toBe(false);
    });
  });
});
