import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Proxy for RxNav's approximateTerm drug search. Runs server-side to avoid
// browser CORS, cache upstream, and normalize the (noisy) candidate names into
// clean, deduped display strings. Auth-gated (audit S3): it's only used by the
// signed-in health-profile medications step, so don't leave an open relay to
// RxNav

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
  const {
    data: { user },
  } = await getCachedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Typeahead fires per keystroke (debounced client-side) — 30/min is generous.
  const { success } = await rateLimit(
    `medications-search:${getClientIp(req.headers)}`,
    30,
    60_000,
  );
  if (!success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

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
