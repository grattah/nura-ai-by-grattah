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
  const withKey: RequestInit = {
    ...init,
    headers: { ...(init?.headers ?? {}), "X-Api-Key": apiKey() },
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, withKey);
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`USDA ${res.status}: ${await res.text()}`);
    return res.json();
  }
  throw new Error("USDA request failed after retries");
}

export async function searchFoods(
  query: string,
  pageSize = 5,
): Promise<UsdaFood[]> {
  const url = `${BASE}/foods/search`;
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

export async function getFoods(fdcIds: number[]): Promise<UsdaFood[]> {
  if (fdcIds.length === 0) return [];
  if (fdcIds.length > 20) throw new Error("getFoods accepts at most 20 ids");
  const url = `${BASE}/foods`;
  const data = (await getJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fdcIds, format: "full" }),
  })) as UsdaFood[];
  return Array.isArray(data) ? data : [];
}
