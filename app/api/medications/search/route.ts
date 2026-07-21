import { NextRequest, NextResponse } from "next/server";

// Proxy for RxNav's approximateTerm drug search. Runs server-side to avoid
// browser CORS, cache upstream, and normalize the (noisy) candidate names into
// clean, deduped display strings.

export const revalidate = 86400;

interface MedicationResult {
  name: string;
  rxcui: string;
}

interface RxNavCandidate {
  rxcui?: string;
  rxaui?: string;
  name?: string;
  rank?: string;
  score?: string;
}

// Strip bracketed source tags, collapse whitespace, capitalize the first letter.
function normalizeName(raw: string): string {
  const cleaned = raw
    .replace(/\[[^\]]*\]/g, "") // drop "[Metforming]" etc.
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : cleaned;
}

export async function GET(req: NextRequest) {
  const term = (req.nextUrl.searchParams.get("term") ?? "").trim();
  if (term.length < 2) {
    return NextResponse.json({ results: [] as MedicationResult[] });
  }

  const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(
    term,
  )}&maxEntries=20`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`RxNav ${res.status}`);

    const data = (await res.json()) as {
      approximateGroup?: { candidate?: RxNavCandidate[] };
    };
    const candidates = data.approximateGroup?.candidate ?? [];

    // Normalize, dedupe case-insensitively (keeping first/highest-ranked), top 5.
    const seen = new Set<string>();
    const results: MedicationResult[] = [];
    for (const c of candidates) {
      if (!c.name || !c.rxcui) continue;
      const name = normalizeName(c.name);
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ name, rxcui: c.rxcui });
      if (results.length >= 5) break;
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[medications/search]", err);
    return NextResponse.json({ results: [] as MedicationResult[] });
  }
}
