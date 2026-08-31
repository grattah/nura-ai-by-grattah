"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  COMMENTS_PAGE_SIZE,
  type AdminComment,
  type CommentFilter,
} from "@/lib/admin/comments";

/**
 * Admin comment moderation.
 *
 * Reads go through the service-role client because the RLS select policy now
 * excludes hidden rows — a moderator using the cookie client could not see the
 * very comments they are meant to review.
 */


export async function listComments(input: {
  filter: CommentFilter;
  search?: string;
  page?: number;
}): Promise<
  { comments: AdminComment[]; total: number } | { error: string }
> {
  const gate = await requireAdmin("viewer");
  if (!gate.ok) return { error: gate.error };

  const admin = createServiceRoleClient();
  const page = Math.max(0, input.page ?? 0);
  const from = page * COMMENTS_PAGE_SIZE;

  const select =
    "id, content, created_at, likes, hidden, hidden_at, hidden_reason, parent_id, recipe_id, user_id, recipes(title), profiles(username)";

  let rows = admin
    .from("comments")
    .select(select as never)
    .order("created_at", { ascending: false })
    .range(from, from + COMMENTS_PAGE_SIZE - 1);
  let counter = admin
    .from("comments")
    .select("id", { count: "exact", head: true });

  if (input.filter === "hidden") {
    rows = rows.eq("hidden" as never, true as never);
    counter = counter.eq("hidden" as never, true as never);
  } else if (input.filter === "visible") {
    rows = rows.eq("hidden" as never, false as never);
    counter = counter.eq("hidden" as never, false as never);
  }

  const term = input.search?.trim();
  if (term) {
    // Content only. Searching the joined author/recipe would need an embedded
    // filter that also drops rows whose join is null, silently hiding comments
    // from deleted accounts — exactly the ones a moderator is looking for.
    rows = rows.ilike("content" as never, `%${term}%` as never);
    counter = counter.ilike("content" as never, `%${term}%` as never);
  }

  const [{ data, error }, { count, error: countError }] = await Promise.all([
    rows,
    counter,
  ]);
  if (error) return { error: error.message };
  if (countError) return { error: countError.message };

  const list = (data ?? []) as unknown as {
    id: string;
    content: string;
    created_at: string;
    likes: number | null;
    hidden: boolean;
    hidden_at: string | null;
    hidden_reason: string | null;
    parent_id: string | null;
    recipe_id: string;
    user_id: string | null;
    recipes: { title: string } | null;
    profiles: { username: string | null } | null;
  }[];

  // Reply counts for the top-level rows on this page. Deleting a parent
  // cascades to its replies (comments_parent_id_fkey ON DELETE CASCADE), so a
  // moderator needs to see how many go with it BEFORE confirming.
  const parentIds = list.filter((c) => !c.parent_id).map((c) => c.id);
  const replyCounts = new Map<string, number>();
  if (parentIds.length) {
    const { data: replies } = await admin
      .from("comments")
      .select("parent_id")
      .in("parent_id", parentIds);
    for (const r of (replies ?? []) as { parent_id: string | null }[]) {
      if (r.parent_id) {
        replyCounts.set(r.parent_id, (replyCounts.get(r.parent_id) ?? 0) + 1);
      }
    }
  }

  return {
    total: count ?? 0,
    comments: list.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.created_at,
      likes: c.likes ?? 0,
      hidden: c.hidden,
      hiddenAt: c.hidden_at,
      hiddenReason: c.hidden_reason,
      parentId: c.parent_id,
      recipeId: c.recipe_id,
      recipeTitle: c.recipes?.title ?? "(deleted recipe)",
      authorId: c.user_id,
      // A comment outlives its author's profile row; showing the comment with
      // no name beats dropping it from moderation entirely.
      authorName: c.profiles?.username ?? "(deleted account)",
      replyCount: replyCounts.get(c.id) ?? 0,
    })),
  };
}

/** Hide or restore one comment. Editor and above. */
export async function setCommentHidden(input: {
  id: string;
  hidden: boolean;
  reason?: string;
}): Promise<{ success: true } | { error: string }> {
  const gate = await requireAdmin("editor");
  if (!gate.ok) return { error: gate.error };

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("comments")
    .select("id, recipe_id")
    .eq("id", input.id)
    .maybeSingle();

  const row = existing as { id: string; recipe_id: string } | null;
  if (!row) return { error: "That comment no longer exists." };

  const { error } = await admin
    .from("comments")
    .update(
      (input.hidden
        ? {
            hidden: true,
            hidden_at: new Date().toISOString(),
            hidden_by: gate.identity.userId,
            hidden_reason: input.reason?.trim() || null,
          }
        : {
            hidden: false,
            hidden_at: null,
            hidden_by: null,
            hidden_reason: null,
          }) as never,
    )
    .eq("id", input.id);

  if (error) return { error: error.message };

  revalidatePath(`/recipes/${row.recipe_id}`);
  revalidatePath("/comments");
  revalidatePath("/admin/comments");
  return { success: true };
}

/**
 * Delete one comment permanently. Admin and above.
 *
 * Irreversible, and `comments_parent_id_fkey` cascades — deleting a top-level
 * comment takes its replies with it. Hiding is the reversible option and the
 * one the UI leads with.
 */
export async function deleteComment(
  id: string,
): Promise<{ success: true; deletedReplies: number } | { error: string }> {
  const gate = await requireAdmin("admin");
  if (!gate.ok) return { error: gate.error };

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("comments")
    .select("id, recipe_id")
    .eq("id", id)
    .maybeSingle();

  const row = existing as { id: string; recipe_id: string } | null;
  if (!row) return { error: "That comment no longer exists." };

  const { count } = await admin
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);

  const { error } = await admin.from("comments").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/recipes/${row.recipe_id}`);
  revalidatePath("/comments");
  revalidatePath("/admin/comments");
  return { success: true, deletedReplies: count ?? 0 };
}
