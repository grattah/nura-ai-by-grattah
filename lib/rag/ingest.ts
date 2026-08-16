// Server-only: vectorize a single recipe's content into `nura_embeddings` so the
// follow-up RAG chat can retrieve grounded context. Used by the admin lifecycle
// (approve / edit / create of approved recipes). The bulk/backfill tool remains
// `scripts/vectorise.mjs` — keep `buildRecipeChunks` below in sync with its
// `recipeChunks()` (separate .mjs runtime, so the logic is intentionally
// duplicated).
import "server-only";

import { embedder } from "./embedder";
import { vectorDB } from "./vector-db";
import { createServiceRoleClient } from "../supabase/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.nuko.health";

export interface RecipeForIngest {
  id: string;
  title: string;
  short_description?: string | null;
  ingredients?: unknown;
  how_to_make?: unknown;
  why_it_works?: string | null;
  inside_tip?: string | null;
}

/**
 * Build the self-contained, title-prefixed chunks for a recipe. Stable ids
 * (`<id>:<section>`) keep upserts idempotent. Empty sections are skipped.
 */
export function buildRecipeChunks(
  r: RecipeForIngest,
): { id: string; content: string }[] {
  const out: { id: string; content: string }[] = [];
  const add = (section: string, body?: string | null) => {
    if (body && body.trim()) {
      out.push({ id: `${r.id}:${section}`, content: `${r.title}\n\n${body.trim()}` });
    }
  };

  add("summary", r.short_description);

  const ingredients = Array.isArray(r.ingredients)
    ? (r.ingredients as Array<{ label?: string }>)
        .map((i) => i?.label?.trim())
        .filter((l): l is string => !!l)
        .join(", ")
    : "";
  add("ingredients", ingredients && `Ingredients: ${ingredients}`);

  const steps = Array.isArray(r.how_to_make)
    ? (r.how_to_make as Array<{ step?: string | number; instruction?: string }>)
        .map((s) =>
          s?.instruction?.trim() ? `${s.step}. ${s.instruction.trim()}` : "",
        )
        .filter(Boolean)
        .join("\n")
    : "";
  add("method", steps && `How to make it:\n${steps}`);

  add("why", r.why_it_works && `Why it works: ${r.why_it_works}`);
  add("tip", r.inside_tip && `Inside tip: ${r.inside_tip}`);

  return out;
}

/**
 * Embed a recipe's chunks and replace its existing vectors. Embeds before
 * deleting so a failed embedding call leaves the current chunks intact.
 */
export async function vectorizeRecipe(r: RecipeForIngest): Promise<void> {
  const chunks = buildRecipeChunks(r);
  if (!chunks.length) return;

  const values = await embedder.embedBatch(chunks.map((c) => c.content));

  // Drop stale chunks first so sections removed in an edit (e.g. the inside tip)
  // don't linger; the upsert below writes the fresh set.
  await createServiceRoleClient()
    .from("nura_embeddings")
    .delete()
    .eq("context_id", r.id);

  await vectorDB.upsert(
    chunks.map((c, i) => ({
      id: c.id,
      values: values[i],
      metadata: {
        context_id: r.id,
        context_type: "recipe" as const,
        title: r.title,
        text: c.content,
        source_url: `${APP_URL}/recipes/${r.id}`,
      },
    })),
  );
}

/** Remove all embeddings for a recipe (used on delete). */
export async function removeRecipeVectors(id: string): Promise<void> {
  await createServiceRoleClient()
    .from("nura_embeddings")
    .delete()
    .eq("context_id", id);
}
