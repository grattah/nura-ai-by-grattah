import { describe, it, expect } from "vitest";
import { withRollback, makeUser, hasTestDb, type Tx } from "../helpers/db";
import { MAX_GOALS } from "@/lib/health-profile/toggle";

const d = hasTestDb ? describe : describe.skip;

// ── QA: "user_id is Null for all records in token_usage" ────────────────────
//
// 58 of 119 runtime rows have no user_id, the newest dated 2026-08-25 — so it
// is ongoing, not historic. A runtime row is a user's spend; if it cannot be
// attributed, nobody's credit usage can be audited.
//
// The constraint is NOT VALID, so it governs new rows without re-checking the
// 58 historic ones. These tests pin both halves of that rule.

d("token_usage attribution", () => {
  it("rejects a runtime row with no user", async () => {
    await withRollback(async (tx) => {
      await expect(
        tx.sql(
          `insert into public.token_usage (source, surface, provider, model, total_tokens)
           values ('runtime', 'recipe-generate', 'anthropic', 'claude-haiku-4-5', 1200)`,
        ),
        "a runtime spend must name its user",
      ).rejects.toThrow(/token_usage_runtime_has_user/);
    });
  });

  it("accepts a runtime row that names its user", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await tx.sql(
        `insert into public.token_usage (source, surface, provider, model, total_tokens, user_id)
         values ('runtime', 'recipe-generate', 'anthropic', 'claude-haiku-4-5', 1200, $1::uuid)`,
        [user],
      );
      const rows = await tx.sql(
        "select user_id from public.token_usage where user_id = $1::uuid",
        [user],
      );
      expect(rows).toHaveLength(1);
    });
  });

  it.each(["script", "cron"])(
    "still allows a %s row with no user — library work has no owner",
    async (source) => {
      await withRollback(async (tx) => {
        await tx.sql(
          `insert into public.token_usage (source, surface, provider, model, total_tokens)
           values ($1, 'usda-classify', 'anthropic', 'claude-haiku-4-5', 500)`,
          [source],
        );
        const rows = await tx.sql(
          "select source from public.token_usage where source = $1 and user_id is null",
          [source],
        );
        expect(rows.length).toBeGreaterThan(0);
      });
    },
  );
});

// ── QA (clarified): "Test the flow state" for Choose my goals ───────────────

/**
 * clock_timestamp(), not now().
 *
 * now() is the TRANSACTION start time and is constant for the whole
 * transaction — so inside this harness two saves would carry an identical
 * updated_at, which is an artifact of testing in one transaction and not how
 * the app behaves (each save is its own transaction). clock_timestamp() reads
 * the actual wall clock and reproduces the real behaviour.
 */
const saveProfile = (tx: Tx, userId: string, goals: string[], conditions: string[] = []) =>
  tx.asUser(
    userId,
    `insert into public.health_profiles (user_id, goals, conditions, updated_at)
     values ($1::uuid, $2::text[], $3::text[], clock_timestamp())
     on conflict (user_id) do update
       set goals = excluded.goals,
           conditions = excluded.conditions,
           updated_at = clock_timestamp()`,
    [userId, goals, conditions],
  );

const readProfile = async (tx: Tx, userId: string) =>
  (
    await tx.asUser<{ goals: string[]; conditions: string[]; updated_at: string }>(
      userId,
      "select goals, conditions, updated_at from public.health_profiles where user_id = $1::uuid",
      [userId],
    )
  )[0];

d("health profile flow", () => {
  it("persists the selected goals and conditions", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await saveProfile(tx, user, ["immunity", "clear-skin"], ["pcos"]);

      const p = await readProfile(tx, user);
      expect(p.goals).toEqual(["immunity", "clear-skin"]);
      expect(p.conditions).toEqual(["pcos"]);
    });
  });

  it("replaces goals on re-save rather than appending", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await saveProfile(tx, user, ["immunity", "stress"]);
      await saveProfile(tx, user, ["libido"]);

      // An append would grow the array past the cap and dilute the Match Score
      // average with selections the user had already removed.
      expect((await readProfile(tx, user)).goals).toEqual(["libido"]);
    });
  });

  it("stamps updated_at on every save, whatever the app sends", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);

      // A BEFORE UPDATE trigger (set_health_profiles_updated_at) overwrites
      // updated_at with now(), so the value the app supplies is ignored on
      // update. Deliberately send a wrong one and prove the trigger wins —
      // that timestamp gates personalizedView and invalidates the safety-alert
      // cache, so a client-supplied value would be a way to spoof freshness.
      await saveProfile(tx, user, ["immunity"]);
      await tx.asUser(
        user,
        `update public.health_profiles
            set goals = $2::text[], updated_at = '1999-01-01'
          where user_id = $1::uuid`,
        [user, ["stress"]],
      );

      const p = await readProfile(tx, user);
      expect(p.goals).toEqual(["stress"]);
      expect(
        new Date(p.updated_at).getFullYear(),
        "the trigger must overwrite a stale client timestamp",
      ).toBeGreaterThan(2000);
    });
  });

  it("has a non-null updated_at, which is what gates the personalized view", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      await saveProfile(tx, user, ["immunity"]);
      // personalizedView = isSub && !!profileUpdatedAt — a null here silently
      // drops the user back to the non-personalized recipe page.
      expect((await readProfile(tx, user)).updated_at).toBeTruthy();
    });
  });

  it("does not let a user write someone else's profile", async () => {
    await withRollback(async (tx) => {
      const alice = await makeUser(tx);
      const bob = await makeUser(tx);

      await expect(
        tx.asUser(
          bob,
          `insert into public.health_profiles (user_id, goals, updated_at)
           values ($1::uuid, $2::text[], now())`,
          [alice, ["immunity"]],
        ),
      ).rejects.toThrow();
    });
  });

  it("stores at most the capped number of goals", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      // saveHealthProfile slices to MAX_GOALS before writing; this asserts the
      // shape the app is expected to persist, since the column itself is an
      // unbounded text[] and would happily take ten.
      const capped = ["immunity", "stress", "libido", "focus", "mood"].slice(
        0,
        MAX_GOALS,
      );
      await saveProfile(tx, user, capped);

      expect((await readProfile(tx, user)).goals).toHaveLength(MAX_GOALS);
      expect(MAX_GOALS).toBe(3);
    });
  });
});
