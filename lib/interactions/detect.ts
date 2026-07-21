import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Admin = SupabaseClient<Database>;

interface SeedRow {
  ingredient_key: string;
  aliases: string[];
  bucket: string;
  severity: "avoid" | "caution";
  layperson_note: string;
  supplement_only: boolean;
}

export interface InteractionIngredient {
  ingredient_key: string;
  bucket: string;
  severity: "avoid" | "caution";
  note: string;
}

// Small in-process cache of the curated dictionary (rarely changes).
let seedCache: { rows: SeedRow[]; at: number } | null = null;
const SEED_TTL = 60 * 60 * 1000;

async function loadSeed(admin: Admin): Promise<SeedRow[]> {
  if (seedCache && Date.now() - seedCache.at < SEED_TTL) return seedCache.rows;
  const { data } = await admin
    .from("ingredient_interactions" as never)
    .select("ingredient_key, aliases, bucket, severity, layperson_note, supplement_only");
  const rows = (data as unknown as SeedRow[]) ?? [];
  seedCache = { rows, at: Date.now() };
  return rows;
}

const SUPPLEMENT_HINTS = [
  "supplement",
  "extract",
  "powder",
  "capsule",
  "tincture",
  "concentrate",
  "high-dose",
  "high dose",
  "standardized",
];

/**
 * Detect curated interaction ingredients in a recipe's free-text ingredient list.
 * `supplement_only` rows trigger only when the label reads as a named supplement/
 * concentrate (not a culinary amount).
 */
export async function detectInteractionIngredients(
  admin: Admin,
  ingredients: unknown,
): Promise<InteractionIngredient[]> {
  const labels = (Array.isArray(ingredients) ? ingredients : [])
    .map((i) => (i as { label?: string })?.label?.toLowerCase().trim())
    .filter((l): l is string => !!l);
  if (!labels.length) return [];

  const seed = await loadSeed(admin);
  const out: InteractionIngredient[] = [];
  const seen = new Set<string>();

  for (const row of seed) {
    const matchedLabel = labels.find((label) =>
      row.aliases.some((a) => label.includes(a.toLowerCase())),
    );
    if (!matchedLabel) continue;
    if (
      row.supplement_only &&
      !SUPPLEMENT_HINTS.some((h) => matchedLabel.includes(h))
    ) {
      continue; // culinary amount — don't flag
    }
    if (seen.has(row.ingredient_key)) continue;
    seen.add(row.ingredient_key);
    out.push({
      ingredient_key: row.ingredient_key,
      bucket: row.bucket,
      severity: row.severity,
      note: row.layperson_note,
    });
  }
  return out;
}
