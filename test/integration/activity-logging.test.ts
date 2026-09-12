import { describe, it, expect } from "vitest";
import { withRollback, makeUser, hasTestDb, type Tx } from "../helpers/db";

const d = hasTestDb ? describe : describe.skip;

const makeRecipe = async (tx: Tx): Promise<string> => {
  const [row] = await tx.sql<{ id: string }>(
    `insert into public.recipes
       (title, short_description, recipe_section_title, why_it_works, inside_tip)
     values ($1, 'desc', 'section', 'why', 'tip')
     returning id`,
    [`Test Recipe ${Math.random().toString(36).slice(2, 8)}`],
  );
  return row.id;
};

d("activity logging under RLS", () => {
  it("lets a user log their own activity", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      const recipe = await makeRecipe(tx);

      await tx.asUser(
        user,
        `insert into public.activities (user_id, recipe_id, action)
         values ($1::uuid, $2::uuid, 'commented on')`,
        [user, recipe],
      );

      const rows = await tx.asUser(
        user,
        `select action from public.activities
          where user_id = $1::uuid and recipe_id = $2::uuid`,
        [user, recipe],
      );
      expect(rows, "the insert policy must allow a user's own activity").toHaveLength(1);
    });
  });

  it("refuses an activity written on someone else's behalf", async () => {
    await withRollback(async (tx) => {
      const alice = await makeUser(tx);
      const bob = await makeUser(tx);
      const recipe = await makeRecipe(tx);

      await expect(
        tx.asUser(
          bob,
          `insert into public.activities (user_id, recipe_id, action)
           values ($1::uuid, $2::uuid, 'commented on')`,
          [alice, recipe],
        ),
        "with_check (user_id = auth.uid()) must reject this",
      ).rejects.toThrow();
    });
  });

  it("accepts the exact action string add-comment.ts writes", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      const recipe = await makeRecipe(tx);

      await tx.asUser(
        user,
        `insert into public.activities (user_id, recipe_id, action)
         values ($1::uuid, $2::uuid, 'commented on')`,
        [user, recipe],
      );

      const [row] = await tx.asUser<{ action: string }>(
        user,
        `select action from public.activities where recipe_id = $1::uuid`,
        [recipe],
      );
      expect(row.action).toBe("commented on");
    });
  });

  it("does not show one user another user's activity", async () => {
    await withRollback(async (tx) => {
      const alice = await makeUser(tx);
      const bob = await makeUser(tx);
      const recipe = await makeRecipe(tx);

      await tx.asUser(
        alice,
        `insert into public.activities (user_id, recipe_id, action)
         values ($1::uuid, $2::uuid, 'viewed')`,
        [alice, recipe],
      );

      const seen = await tx.asUser(
        bob,
        `select action from public.activities where recipe_id = $1::uuid`,
        [recipe],
      );
      expect(seen, "the feed is personal — bob sees none of alice's").toHaveLength(0);
    });
  });
});

d("recipe page comment visibility", () => {
  it("returns the newest comment first, so the page can show one", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      const recipe = await makeRecipe(tx);

      for (const [body, ago] of [
        ["oldest", "3 hours"],
        ["middle", "2 hours"],
        ["newest", "1 hour"],
      ] as const) {
        await tx.sql(
          `insert into public.comments (user_id, recipe_id, content, created_at)
           values ($1::uuid, $2::uuid, $3, now() - $4::interval)`,
          [user, recipe, body, ago],
        );
      }

      const rows = await tx.sql<{ content: string }>(
        `select content from public.comments
          where recipe_id = $1::uuid and parent_id is null
          order by created_at desc limit 1`,
        [recipe],
      );
      expect(rows[0].content).toBe("newest");
    });
  });

  it("counts only top-level comments, not replies", async () => {
    await withRollback(async (tx) => {
      const user = await makeUser(tx);
      const recipe = await makeRecipe(tx);

      const [parent] = await tx.sql<{ id: string }>(
        `insert into public.comments (user_id, recipe_id, content)
         values ($1::uuid, $2::uuid, 'top level') returning id`,
        [user, recipe],
      );
      await tx.sql(
        `insert into public.comments (user_id, recipe_id, content, parent_id)
         values ($1::uuid, $2::uuid, 'a reply', $3::uuid)`,
        [user, recipe, parent.id],
      );

      const [{ count }] = await tx.sql<{ count: string }>(
        `select count(*)::text as count from public.comments
          where recipe_id = $1::uuid and parent_id is null`,
        [recipe],
      );
      expect(Number(count)).toBe(1);
    });
  });
});
