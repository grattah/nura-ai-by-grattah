import { describe, it, expect } from "vitest";
import { withRollback, makeUser, hasTestDb, type Tx } from "../helpers/db";

const d = hasTestDb ? describe : describe.skip;

const seed = (tx: Tx, userId: string, sub: number, purchased: number, frozen = false) =>
  tx.sql(
    `insert into public.credits (user_id, subscription_units, purchased_units, purchased_frozen)
     values ($1::uuid, $2, $3, $4)`,
    [userId, sub, purchased, frozen],
  );

const balances = async (tx: Tx, userId: string) =>
  (
    await tx.sql<{ subscription_units: number; purchased_units: number }>(
      `select subscription_units, purchased_units
         from public.credits where user_id = $1::uuid`,
      [userId],
    )
  )[0];

const reserve = (tx: Tx, userId: string, action: string) =>
  tx.sql<{
    id: string | null;
    cost_units: number;
    from_subscription: number;
    from_purchased: number;
  }>("select * from public.reserve_units($1::uuid, $2)", [userId, action]);

d("spend routing (spec §5)", () => {
  it("takes a generate entirely from subscription when it can", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await seed(tx, user, 100, 50);

      const [r] = await reserve(tx, user, "generate");
      expect(r.cost_units).toBe(3);
      expect(r.from_subscription).toBe(3);
      expect(r.from_purchased).toBe(0);

      const b = await balances(tx, user);
      expect(b.subscription_units, "units leave at RESERVE time").toBe(97);
      expect(b.purchased_units).toBe(50);
    });
  });

  it("runs the spec's worked example — 1 sub token + 5 purchased, one recipe", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await seed(tx, user, 2, 5);

      const [r] = await reserve(tx, user, "generate");
      expect(r.from_subscription).toBe(2);
      expect(r.from_purchased).toBe(1);

      const b = await balances(tx, user);
      expect(b.subscription_units).toBe(0);
      expect(b.purchased_units).toBe(4);
    });
  });

  it("blocks and spends nothing when the balances cannot cover it", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await seed(tx, user, 0, 2);

      const rows = await reserve(tx, user, "generate");
      expect(rows[0]?.id ?? null, "no reservation may be issued").toBeNull();

      const b = await balances(tx, user);
      expect(b.purchased_units, "a blocked action spends nothing").toBe(2);
    });
  });

  it("cannot spend frozen purchased units", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await seed(tx, user, 0, 50, true);

      const rows = await reserve(tx, user, "followup");
      expect(rows[0]?.id ?? null).toBeNull();

      const b = await balances(tx, user);
      expect(b.purchased_units, "frozen units are retained, never spent").toBe(50);
    });
  });
});

d("reserve → settle / release (spec §6)", () => {
  it("settling consumes the units permanently", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await seed(tx, user, 10, 0);

      const [r] = await reserve(tx, user, "generate");
      await tx.sql("select public.settle_reservation($1::uuid)", [r.id]);

      expect((await balances(tx, user)).subscription_units).toBe(7);
    });
  });

  it("releasing refunds to the SAME balances, in the same proportions", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await seed(tx, user, 2, 5);

      const [r] = await reserve(tx, user, "generate");
      expect([r.from_subscription, r.from_purchased]).toEqual([2, 1]);

      await tx.sql("select public.release_reservation($1::uuid)", [r.id]);

      const b = await balances(tx, user);
      expect(b.subscription_units).toBe(2);
      expect(b.purchased_units).toBe(5);
    });
  });

  it("does not refund twice if release is called again", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await seed(tx, user, 10, 0);

      const [r] = await reserve(tx, user, "generate");
      await tx.sql("select public.release_reservation($1::uuid)", [r.id]);
      await tx.sql("select public.release_reservation($1::uuid)", [r.id]);

      expect((await balances(tx, user)).subscription_units).toBe(10);
    });
  });

  it("cannot settle a reservation that was already released", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await seed(tx, user, 10, 0);

      const [r] = await reserve(tx, user, "generate");
      await tx.sql("select public.release_reservation($1::uuid)", [r.id]);
      await tx.sql("select public.settle_reservation($1::uuid)", [r.id]);

      expect((await balances(tx, user)).subscription_units).toBe(10);
    });
  });
});

d("concurrency — the reason units leave at reserve time", () => {
  it("does not let repeated reservations overspend the balance", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await seed(tx, user, 5, 0);

      const first = await reserve(tx, user, "generate");
      const second = await reserve(tx, user, "generate");

      expect(first[0]?.id, "first reservation succeeds").toBeTruthy();
      expect(
        second[0]?.id ?? null,
        "second must be refused — 2 units left, 3 needed",
      ).toBeNull();

      const b = await balances(tx, user);
      expect(b.subscription_units, "balance can never go negative").toBe(2);
    });
  });
});
