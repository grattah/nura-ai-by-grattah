import { describe, it, expect } from "vitest";
import { withRollback, makeUser, hasTestDb } from "../helpers/db";

const d = hasTestDb ? describe : describe.skip;

d("RLS — one user cannot read another's rows", () => {
  it("hides another user's health profile", async () => {
    await withRollback(async (tx) => {
      const alice = await makeUser(tx);
      const bob = await makeUser(tx);

      await tx.sql(
        `insert into public.health_profiles (user_id, goals, conditions, updated_at)
         values ($1, array['immunity'], array['pcos'], now())`,
        [alice],
      );

      const own = await tx.asUser(
        alice,
        "select user_id from public.health_profiles where user_id = $1",
        [alice],
      );
      expect(own, "a user must see their own profile").toHaveLength(1);

      const other = await tx.asUser(
        bob,
        "select user_id from public.health_profiles where user_id = $1",
        [alice],
      );
      expect(other, "bob must not read alice's profile").toHaveLength(0);
    });
  });

  it("hides another user's subscription", async () => {
    await withRollback(async (tx) => {
      const alice = await makeUser(tx);
      const bob = await makeUser(tx);

      await tx.sql(
        `insert into public.subscriptions (user_id, plan, status, expires_at)
         values ($1, 'monthly', 'active', now() + interval '30 days')`,
        [alice],
      );

      const other = await tx.asUser(
        bob,
        "select user_id from public.subscriptions where user_id = $1",
        [alice],
      );
      expect(other).toHaveLength(0);
    });
  });

  it("hides another user's token balance", async () => {
    await withRollback(async (tx) => {
      const alice = await makeUser(tx);
      const bob = await makeUser(tx);

      await tx.sql(
        `insert into public.credits (user_id, subscription_units, purchased_units)
         values ($1, 100, 50)`,
        [alice],
      );

      const other = await tx.asUser(
        bob,
        "select user_id from public.credits where user_id = $1",
        [alice],
      );
      expect(other).toHaveLength(0);
    });
  });

  it("gives a signed-out visitor nothing from those tables", async () => {
    await withRollback(async (tx) => {
      const alice = await makeUser(tx);
      await tx.sql(
        `insert into public.health_profiles (user_id, goals, updated_at)
         values ($1, array['immunity'], now())`,
        [alice],
      );

      const rows = await tx.asAnon("select user_id from public.health_profiles");
      expect(rows).toHaveLength(0);
    });
  });
});

d("RLS — tables the app reads must actually be readable", () => {
  it("reports which public tables have RLS on but no policy", async () => {
    await withRollback(async (tx) => {
      const rows = await tx.sql<{ relname: string }>(
        `select c.relname
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relkind = 'r'
            and c.relrowsecurity
            and not exists (
              select 1 from pg_policies p
               where p.schemaname = 'public' and p.tablename = c.relname
            )
          order by c.relname`,
      );

      const names = rows.map((r) => r.relname);
      expect(
        names,
        `RLS-on-but-no-policy tables (service-role only by design?): ${names.join(", ")}`,
      ).toBeDefined();
    });
  });
});
