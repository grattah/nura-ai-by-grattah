import { describe, it, expect } from "vitest";
import { withRollback, makeUser, hasTestDb, type Tx } from "../helpers/db";

/**
 * Comment moderation (admin: review / hide / delete).
 *
 * Integration rather than unit, deliberately: hiding is enforced by an RLS
 * policy, and a mocked Supabase client returns whatever rows the mock was told
 * to return. Only a real connection, as the real roles, can show that a hidden
 * comment is actually unreachable — the same gap that let `ingredients` sit
 * behind RLS with zero policies while every test stayed green.
 */

const d = hasTestDb ? describe : describe.skip;

async function fixture(tx: Tx) {
  const userId = await makeUser(tx);
  // A trigger on auth.users already creates the profile row, so this names
  // it rather than inserting a second one.
  await tx.sql(
    `insert into public.profiles (id, username) values ($1, $2)
     on conflict (id) do update set username = excluded.username`,
    [userId, "mod-test-user"],
  );

  const [recipe] = await tx.sql<{ id: string }>(
    `insert into public.recipes
       (title, short_description, recipe_section_title, why_it_works, inside_tip, status)
     values ('Moderation Fixture', 'd', 's', 'w', 't', 'approved')
     returning id`,
  );

  const [parent] = await tx.sql<{ id: string }>(
    `insert into public.comments (recipe_id, user_id, content)
     values ($1, $2, 'the parent comment') returning id`,
    [recipe.id, userId],
  );

  const [reply] = await tx.sql<{ id: string }>(
    `insert into public.comments (recipe_id, user_id, content, parent_id)
     values ($1, $2, 'a reply', $3) returning id`,
    [recipe.id, userId, parent.id],
  );

  return { userId, recipeId: recipe.id, parentId: parent.id, replyId: reply.id };
}

const hide = (tx: Tx, id: string) =>
  tx.sql(
    `update public.comments set hidden = true, hidden_at = now() where id = $1`,
    [id],
  );

d("hiding a comment", () => {
  it("leaves a visible comment readable by a signed-out visitor", async () => {
    await withRollback(async (tx) => {
      const { parentId } = await fixture(tx);
      const rows = await tx.asAnon(
        `select id from public.comments where id = $1`,
        [parentId],
      );
      expect(rows).toHaveLength(1);
    });
  });

  it("hides it from signed-out visitors", async () => {
    await withRollback(async (tx) => {
      const { parentId } = await fixture(tx);
      await hide(tx, parentId);
      const rows = await tx.asAnon(
        `select id from public.comments where id = $1`,
        [parentId],
      );
      expect(rows).toEqual([]);
    });
  });

  it("hides it from its own author, rather than shadow-banning", async () => {
    // Showing a hidden comment back to its author alone would let them believe
    // it still stands. The policy is `hidden = false` with no author exception.
    await withRollback(async (tx) => {
      const { userId, parentId } = await fixture(tx);
      await hide(tx, parentId);
      const rows = await tx.asUser(
        userId,
        `select id from public.comments where id = $1`,
        [parentId],
      );
      expect(rows).toEqual([]);
    });
  });

  it("drops it from the count a recipe page renders", async () => {
    // The recipe page counts with `head: true`. A comment filtered only in
    // application code would still be counted here.
    await withRollback(async (tx) => {
      const { recipeId, parentId } = await fixture(tx);
      const before = await tx.asAnon<{ n: string }>(
        `select count(*) as n from public.comments where recipe_id = $1 and parent_id is null`,
        [recipeId],
      );
      expect(Number(before[0].n)).toBe(1);

      await hide(tx, parentId);

      const after = await tx.asAnon<{ n: string }>(
        `select count(*) as n from public.comments where recipe_id = $1 and parent_id is null`,
        [recipeId],
      );
      expect(Number(after[0].n)).toBe(0);
    });
  });

  it("keeps it visible to the moderator, who reads as the owner", async () => {
    await withRollback(async (tx) => {
      const { parentId } = await fixture(tx);
      await hide(tx, parentId);
      const rows = await tx.sql(
        `select id, hidden from public.comments where id = $1`,
        [parentId],
      );
      expect(rows).toHaveLength(1);
    });
  });

  it("stops the author unhiding their own comment", async () => {
    // comments_update_own carries `hidden = false` in USING and WITH CHECK, so
    // a hidden row is not an updatable target for its author.
    await withRollback(async (tx) => {
      const { userId, parentId } = await fixture(tx);
      await hide(tx, parentId);

      await tx.asUser(
        userId,
        `update public.comments set hidden = false where id = $1`,
        [parentId],
      );

      const [row] = await tx.sql<{ hidden: boolean }>(
        `select hidden from public.comments where id = $1`,
        [parentId],
      );
      expect(row.hidden).toBe(true);
    });
  });

  it("is reversible — restoring brings it back", async () => {
    await withRollback(async (tx) => {
      const { parentId } = await fixture(tx);
      await hide(tx, parentId);
      await tx.sql(
        `update public.comments set hidden = false, hidden_at = null where id = $1`,
        [parentId],
      );
      const rows = await tx.asAnon(
        `select id from public.comments where id = $1`,
        [parentId],
      );
      expect(rows).toHaveLength(1);
    });
  });
});

d("deleting a comment", () => {
  it("takes its replies with it", async () => {
    // comments_parent_id_fkey is ON DELETE CASCADE. The admin UI states the
    // reply count in the confirmation because of this.
    await withRollback(async (tx) => {
      const { parentId, replyId } = await fixture(tx);
      await tx.sql(`delete from public.comments where id = $1`, [parentId]);
      const rows = await tx.sql(
        `select id from public.comments where id = any($1)`,
        [[parentId, replyId]],
      );
      expect(rows).toEqual([]);
    });
  });

  it("leaves the parent alone when only a reply is deleted", async () => {
    await withRollback(async (tx) => {
      const { parentId, replyId } = await fixture(tx);
      await tx.sql(`delete from public.comments where id = $1`, [replyId]);
      const rows = await tx.sql(`select id from public.comments where id = $1`, [
        parentId,
      ]);
      expect(rows).toHaveLength(1);
    });
  });
});
