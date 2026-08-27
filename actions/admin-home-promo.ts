"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { MAX_PROMO_BODY, type HomePromo } from "@/lib/home-promo";

/**
 * The homepage promo card, edited from /admin/home-promo.
 *
 * Single row (see the migration): the table's primary key is pinned to `true`,
 * so an upsert always targets the same record and there is no way to end up
 * with two cards competing to be shown.
 */

export interface PromoRecipeOption {
  id: string;
  title: string;
}

/** Current card, for the admin form. */
export async function getHomePromoForAdmin(): Promise<
  { promo: HomePromo; recipeTitle: string | null } | { error: string }
> {
  const gate = await requireAdmin("viewer");
  if (!gate.ok) return { error: gate.error };

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("home_promo" as never)
    .select("body, recipe_id, updated_at, recipes(title)")
    .eq("id" as never, true as never)
    .maybeSingle();

  if (error) return { error: error.message };

  const row = data as unknown as {
    body: string;
    recipe_id: string | null;
    updated_at: string;
    recipes: { title: string } | null;
  } | null;

  return {
    promo: {
      body: row?.body ?? "",
      recipeId: row?.recipe_id ?? null,
      updatedAt: row?.updated_at ?? null,
    },
    recipeTitle: row?.recipes?.title ?? null,
  };
}

/**
 * Recipe picker search.
 *
 * Approved only — the card links straight to the recipe page, and pointing the
 * homepage at a pending recipe would surface unreviewed content.
 */
export async function searchPromoRecipes(
  query: string,
): Promise<{ recipes: PromoRecipeOption[] } | { error: string }> {
  const gate = await requireAdmin("viewer");
  if (!gate.ok) return { error: gate.error };

  const term = query.trim();
  const admin = createServiceRoleClient();

  let q = admin
    .from("recipes")
    .select("id, title")
    .eq("status", "approved")
    .order("title", { ascending: true })
    .limit(20);

  // Empty search shows the first 20 rather than nothing, so the picker is
  // usable before typing.
  if (term) q = q.ilike("title", `%${term}%`);

  const { data, error } = await q;
  if (error) return { error: error.message };

  return { recipes: (data ?? []) as PromoRecipeOption[] };
}

export async function saveHomePromo(input: {
  body: string;
  recipeId: string | null;
}): Promise<{ success: true } | { error: string }> {
  // Editor and above — this is homepage copy, the same bar as editing a recipe.
  const gate = await requireAdmin("editor");
  if (!gate.ok) return { error: gate.error };

  const body = input.body.trim();
  if (!body) return { error: "The card needs some text." };
  if (body.length > MAX_PROMO_BODY) {
    return { error: `Keep it under ${MAX_PROMO_BODY} characters.` };
  }

  const admin = createServiceRoleClient();

  // Verify the recipe exists and is approved rather than trusting the id from
  // the form — the picker only offers approved recipes, but the id arrives from
  // the client and a stale tab could submit one that has since been unpublished.
  if (input.recipeId) {
    const { data: recipe } = await admin
      .from("recipes")
      .select("id, status")
      .eq("id", input.recipeId)
      .maybeSingle();

    const found = recipe as { id: string; status: string } | null;
    if (!found) return { error: "That recipe no longer exists." };
    if (found.status !== "approved") {
      return { error: "That recipe isn't approved, so it can't be linked." };
    }
  }

  const { error } = await admin.from("home_promo" as never).upsert(
    {
      id: true,
      body,
      recipe_id: input.recipeId,
      updated_at: new Date().toISOString(),
      updated_by: gate.identity.userId,
    } as never,
    { onConflict: "id" },
  );

  if (error) return { error: error.message };

  // The homepage is a server component; without this the old copy is served
  // from the route cache until it happens to revalidate.
  revalidatePath("/");
  return { success: true };
}
