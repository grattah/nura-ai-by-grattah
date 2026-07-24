// USDA FoodData Central API client (PRD: USDA Nutrient Data Integration §6).
// Used only by the one-time batch resolve process — never at request/view time
// (nutrient values are cached permanently per ingredient). Requires
// USDA_FOOD_DATA_API_KEY.

const BASE = "https://api.nal.usda.gov/fdc/v1";

export interface UsdaFood {
  fdcId: number;
  description: string;
  dataType?: string;
  foodCategory?: string;
  foodNutrients: Array<Record<string, unknown>>;
  foodPortions?: Array<Record<string, unknown>>;
}

function apiKey(): string {
  const key = process.env.USDA_FOOD_DATA_API_KEY;
  if (!key) throw new Error("Missing USDA_FOOD_DATA_API_KEY");
  return key;
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  // Retry on rate limit / transient errors with linear backoff.
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, init);
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`USDA ${res.status}: ${await res.text()}`);
    return res.json();
  }
  throw new Error("USDA request failed after retries");
}

/**
 * Search for a food by name. Prefers whole/less-processed data types
 * (Foundation, SR Legacy) over Branded, which matches how we want to classify
 * generic recipe ingredients.
 */
export async function searchFoods(
  query: string,
  pageSize = 5,
): Promise<UsdaFood[]> {
  // POST with a JSON body — the dataType filter (with spaces/parens like
  // "Survey (FNDDS)") breaks the GET query string (nginx 400), but POST is fine.
  const url = `${BASE}/foods/search?api_key=${apiKey()}`;
  const data = (await getJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query,
      dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"],
      pageSize,
    }),
  })) as { foods?: UsdaFood[] };
  return data.foods ?? [];
}

/** Fetch full nutrient data for up to 20 FDC ids in one request. */
export async function getFoods(fdcIds: number[]): Promise<UsdaFood[]> {
  if (fdcIds.length === 0) return [];
  if (fdcIds.length > 20) throw new Error("getFoods accepts at most 20 ids");
  const url = `${BASE}/foods?api_key=${apiKey()}`;
  const data = (await getJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fdcIds, format: "full" }),
  })) as UsdaFood[];
  return Array.isArray(data) ? data : [];
}
