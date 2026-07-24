import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export interface DailyTip {
  title: string;
  description: string;
  imageUrl?: string;
}

export interface DailyTipRow {
  day: string;
  title: string;
  description: string;
  image_url: string | null;
}

// `daily_tips` isn't in the generated Supabase types yet, so expose a minimal
// typed accessor (single cast) instead of scattering `as never` casts. Drop this
// once `npm run generate-types` includes the table.
interface DailyTipsBuilder {
  select: (cols: string) => DailyTipsBuilder;
  eq: (col: string, val: string) => DailyTipsBuilder;
  maybeSingle: () => Promise<{ data: DailyTipRow | null }>;
  upsert: (
    row: Omit<DailyTipRow, "image_url"> & { image_url: string | null },
    opts: { onConflict: string; ignoreDuplicates: boolean },
  ) => Promise<{ error: unknown }>;
}

export function dailyTipsTable(
  admin: ReturnType<typeof createServiceRoleClient>,
): DailyTipsBuilder {
  return (admin.from as unknown as (t: string) => DailyTipsBuilder)(
    "daily_tips",
  );
}

/** UTC calendar day key (YYYY-MM-DD) — the daily_tips primary key. */
export function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Shown instantly while a day's generated tip isn't ready yet. */
export const FALLBACK_TIP: DailyTip = {
  title: "Chew a little longer",
  description:
    "Digestion begins in the mouth. Twenty unhurried chews per bite can noticeably reduce bloating.",
  imageUrl: "/daily-wtip.png",
};

/**
 * Today's stored tip (or null if not generated yet). Cached per UTC day so each
 * new day is a fresh entry and old days never carry over.
 */
export async function getDailyTip(day: string): Promise<DailyTip | null> {
  const admin = createServiceRoleClient();
  const { data } = await dailyTipsTable(admin)
    .select("title, description, image_url")
    .eq("day", day)
    .maybeSingle();
  if (!data) return null;
  return {
    title: data.title,
    description: data.description,
    imageUrl: data.image_url ?? undefined,
  };
}
