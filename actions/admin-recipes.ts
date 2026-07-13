"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { canApprove } from "@/lib/admin/roles";
import type { DrinkTypeSlug } from "@/lib/drink-types";
import {
  vectorizeRecipe,
  removeRecipeVectors,
  type RecipeForIngest,
} from "@/lib/rag/ingest";

const BUCKET = "recipe-images";

export interface RecipeInput {
  title: string;
  short_description: string;
  recipe_section_title: string;
  why_it_works: string;
  inside_tip: string;
  source_url: string;
  display_order: number | null;
  is_todays_recipe: boolean;
  status: "pending" | "approved";
  drink_type: DrinkTypeSlug;
  image_url: string | null;
  ingredients: { emoji: string; label: string }[];
  how_to_make: { step: string; instruction: string }[];
  preview_ingredients: string[];
  follow_up_questions: string[];
  tagIds: string[];
}

type Result<T = { success: true }> = T | { error: string };

export interface RecipeListItem {
  id: string;
  title: string;
  status: "pending" | "approved";
  display_order: number;
  created_at: string;
}

/**
 * Paginated recipe batch for the admin table. Any member may read. `hasMore` is
 * true when a full `limit` came back (so another page likely exists).
 */
export async function fetchAdminRecipes({
  offset,
  limit,
  status,
}: {
  offset: number;
  limit: number;
  status: "all" | "pending" | "approved";
}): Promise<{ rows: RecipeListItem[]; hasMore: boolean } | { error: string }> {
  const gate = await requireAdmin("viewer");
  if (!gate.ok) return { error: gate.error };

  const admin = createServiceRoleClient();
  let query = admin
    .from("recipes")
    .select("id, title, status, display_order, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status !== "all") query = query.eq("status" as never, status as never);

  const { data, error } = await query;
  if (error) return { error: error.message };

  const rows = (data as unknown as RecipeListItem[] | null) ?? [];
  return { rows, hasMore: rows.length === limit };
}

/**
 * Uploads a recipe image via the service-role client (the `recipe-images`
 * bucket has no client write policy, so browser uploads are denied by RLS).
 * Role-gated to editors+ and returns the public URL.
 */
export async function uploadRecipeImage(
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  const gate = await requireAdmin("editor");
  if (!gate.ok) return { error: gate.error };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided." };
  if (!file.type.startsWith("image/")) {
    return { error: "File must be an image." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Image must be under 5MB." };
  }

  const admin = createServiceRoleClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `uploads/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (error) return { error: error.message };

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { url: publicUrl };
}

function validate(input: RecipeInput): string | null {
  if (!input.title?.trim()) return "Title is required.";
  if (!input.short_description?.trim()) return "Short description is required.";
  return null;
}

async function nextDisplayOrder(
  admin: ReturnType<typeof createServiceRoleClient>,
): Promise<number> {
  const { data } = await admin
    .from("recipes")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.display_order as number | undefined) ?? 0) + 1;
}

// No-op: recipe_tags now holds computed bioactivity scores (populated by
// scripts/score-supports.mjs), not manually-assigned category tags. Admin
// category editing is a follow-up; leaving this in place avoids clobbering the
// scored rows on every admin save.
async function syncTags(
  _admin: ReturnType<typeof createServiceRoleClient>,
  _recipeId: string,
  _tagIds: string[],
) {
  return;
}

// Best-effort vectorization: never block an approval/edit on an embedding hiccup
// (the recipe is still saved; re-saving or the bulk script can retry).
async function safeVectorize(recipe: RecipeForIngest) {
  try {
    await vectorizeRecipe(recipe);
  } catch (e) {
    console.error("[admin-recipes] vectorize", e);
  }
}

function ingestShape(id: string, input: RecipeInput): RecipeForIngest {
  return {
    id,
    title: input.title,
    short_description: input.short_description,
    ingredients: input.ingredients,
    how_to_make: input.how_to_make,
    why_it_works: input.why_it_works,
    inside_tip: input.inside_tip,
  };
}

export async function createRecipe(
  input: RecipeInput,
): Promise<Result<{ id: string }>> {
  const gate = await requireAdmin("admin");
  if (!gate.ok) return { error: gate.error };
  const invalid = validate(input);
  if (invalid) return { error: invalid };

  const admin = createServiceRoleClient();
  const display_order =
    input.display_order && input.display_order > 0
      ? input.display_order
      : await nextDisplayOrder(admin);

  const payload = {
    title: input.title.trim(),
    short_description: input.short_description.trim(),
    recipe_section_title: input.recipe_section_title.trim(),
    why_it_works: input.why_it_works,
    inside_tip: input.inside_tip,
    source_url: input.source_url ?? "",
    display_order,
    is_todays_recipe: input.is_todays_recipe,
    drink_type: input.drink_type,
    image_url: input.image_url,
    ingredients: input.ingredients,
    how_to_make: input.how_to_make,
    preview_ingredients: input.preview_ingredients,
    follow_up_questions: input.follow_up_questions,
    likes: 0,
    status: input.status,
    created_by: gate.identity.userId,
  };

  const { data, error } = await admin
    .from("recipes")
    .insert(payload as never)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Failed to create." };

  await syncTags(admin, data.id, input.tagIds);
  if (input.status === "approved") {
    await safeVectorize(ingestShape(data.id, input));
  }
  revalidatePath("/admin/recipes");
  return { id: data.id };
}

export async function updateRecipe(
  id: string,
  input: RecipeInput,
): Promise<Result> {
  const gate = await requireAdmin("editor");
  if (!gate.ok) return { error: gate.error };
  const invalid = validate(input);
  if (invalid) return { error: invalid };

  const admin = createServiceRoleClient();

  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    short_description: input.short_description.trim(),
    recipe_section_title: input.recipe_section_title.trim(),
    why_it_works: input.why_it_works,
    inside_tip: input.inside_tip,
    source_url: input.source_url ?? "",
    display_order: input.display_order ?? 0,
    is_todays_recipe: input.is_todays_recipe,
    drink_type: input.drink_type,
    image_url: input.image_url,
    ingredients: input.ingredients,
    how_to_make: input.how_to_make,
    preview_ingredients: input.preview_ingredients,
    follow_up_questions: input.follow_up_questions,
  };
  // Only admins/owner may change publish status.
  if (canApprove(gate.identity.role)) payload.status = input.status;

  const { data: updated, error } = await admin
    .from("recipes")
    .update(payload as never)
    .eq("id", id)
    .select("status")
    .maybeSingle();
  if (error) return { error: error.message };

  await syncTags(admin, id, input.tagIds);
  // Re-vectorize when the recipe is (now) approved — covers an admin
  // approving-on-edit and an editor editing an already-approved recipe.
  if ((updated as { status?: string } | null)?.status === "approved") {
    await safeVectorize(ingestShape(id, input));
  }
  revalidatePath("/admin/recipes");
  revalidatePath(`/recipes/${id}`);
  updateTag(`recipe-${id}`);
  return { success: true };
}

export async function setRecipeStatus(
  id: string,
  status: "pending" | "approved",
): Promise<Result> {
  const gate = await requireAdmin("admin");
  if (!gate.ok) return { error: gate.error };

  const admin = createServiceRoleClient();
  const { data: row, error } = await admin
    .from("recipes")
    .update({ status } as never)
    .eq("id", id)
    .select(
      "id, title, short_description, ingredients, how_to_make, why_it_works, inside_tip",
    )
    .maybeSingle();
  if (error) return { error: error.message };

  if (status === "approved" && row) {
    await safeVectorize(row as unknown as RecipeForIngest);
  }

  revalidatePath("/admin/recipes");
  revalidatePath(`/recipes/${id}`);
  updateTag(`recipe-${id}`);
  return { success: true };
}

export async function deleteRecipe(id: string): Promise<Result> {
  const gate = await requireAdmin("admin");
  if (!gate.ok) return { error: gate.error };

  const admin = createServiceRoleClient();

  // Remove the stored image (path derived from the public URL) if it's ours.
  const { data: row } = await admin
    .from("recipes")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();
  const imageUrl = row?.image_url as string | null | undefined;
  if (imageUrl) {
    const marker = `/${BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx !== -1) {
      const path = imageUrl.slice(idx + marker.length);
      await admin.storage.from(BUCKET).remove([path]);
    }
  }

  await admin.from("recipe_tags").delete().eq("recipe_id", id);
  await removeRecipeVectors(id);
  const { error } = await admin.from("recipes").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/recipes");
  updateTag(`recipe-${id}`);
  return { success: true };
}
