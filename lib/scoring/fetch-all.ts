import type { SupabaseClient } from "@supabase/supabase-js";

/** Reads every row page by page; PostgREST silently caps responses at 1,000 rows. */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) return out;
  }
}

export function pagedSelect<T>(
  supabase: SupabaseClient<never>,
  table: string,
  columns: string,
  refine?: (q: ReturnType<ReturnType<SupabaseClient<never>["from"]>["select"]>) => unknown,
) {
  return fetchAll<T>((from, to) => {
    let q = supabase.from(table as never).select(columns).range(from, to);
    if (refine) q = refine(q as never) as never;
    return q as never;
  });
}
