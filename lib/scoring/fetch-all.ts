import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Read every row of a query, page by page.
 *
 * PostgREST caps a response at 1,000 rows by default and returns them WITHOUT
 * error — so a query over a larger table silently returns a prefix. That is how
 * the tier classification covered 301 of 368 ingredients and the category
 * preview covered 184 of 243 recipes, both reporting success.
 *
 * Anything scanning a whole table must go through this.
 */
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

/** Convenience for the common `select(...).range(...)` shape. */
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
