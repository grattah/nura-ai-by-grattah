import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { deriveBuckets, type Bucket } from "./buckets";

type Admin = SupabaseClient<Database>;

const OWN_RELAS = new Set(["has_epc", "has_moa", "has_pe"]);

interface RxClassInfo {
  rela?: string;
  rxclassMinConceptItem?: { className?: string; classType?: string };
}

async function getInfo(
  rxcui: string,
  relaSource: string,
): Promise<RxClassInfo[]> {
  const url = `https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json?rxcui=${encodeURIComponent(
    rxcui,
  )}&relaSource=${relaSource}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 604800 }, // 1 week
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      rxclassDrugInfoList?: { rxclassDrugInfo?: RxClassInfo[] };
    };
    return data.rxclassDrugInfoList?.rxclassDrugInfo ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

async function fetchOwnClasses(rxcui: string): Promise<string[]> {
  const names = new Set<string>();
  for (const src of ["DAILYMED", "MEDRT"]) {
    for (const r of await getInfo(rxcui, src)) {
      if (OWN_RELAS.has(r.rela ?? "") && r.rxclassMinConceptItem?.className)
        names.add(r.rxclassMinConceptItem.className);
    }
  }
  for (const r of await getInfo(rxcui, "ATC")) {
    if (r.rxclassMinConceptItem?.className)
      names.add(r.rxclassMinConceptItem.className);
  }
  return [...names];
}

export interface ResolvedMedication {
  name: string;
  buckets: Bucket[];
}

/**
 * The user's medications (those with an rxcui) each resolved to their interaction
 * buckets, so an alert can name the specific drug(s). Uses the per-drug cache;
 * resolves + caches any misses via RxClass.
 */
export async function resolveMedications(
  admin: Admin,
  meds: { name: string | null; rxcui: string | null }[],
): Promise<ResolvedMedication[]> {
  const withRxcui = meds.filter((m) => m.rxcui);
  const rxcuis = [...new Set(withRxcui.map((m) => m.rxcui as string))];
  if (!rxcuis.length) return [];

  const { data: cachedRaw } = await admin
    .from("drug_interaction_buckets" as never)
    .select("rxcui, buckets")
    .in("rxcui", rxcuis);
  const byRxcui = new Map<string, Bucket[]>(
    (
      (cachedRaw as unknown as { rxcui: string; buckets: string[] }[]) ?? []
    ).map((r) => [r.rxcui, r.buckets as Bucket[]]),
  );

  for (const rxcui of rxcuis) {
    if (byRxcui.has(rxcui)) continue;
    const classes = await fetchOwnClasses(rxcui);
    const buckets = deriveBuckets(classes);
    byRxcui.set(rxcui, buckets);
    const name = withRxcui.find((m) => m.rxcui === rxcui)?.name ?? null;
    await admin
      .from("drug_interaction_buckets" as never)
      .upsert(
        {
          rxcui,
          drug_name: name,
          buckets,
          resolved_at: new Date().toISOString(),
        } as never,
        { onConflict: "rxcui" },
      );
  }

  return withRxcui.map((m) => ({
    name: m.name ?? "",
    buckets: byRxcui.get(m.rxcui as string) ?? [],
  }));
}
