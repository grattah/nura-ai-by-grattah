/**
 * Dev-only timing helper for server-side work — RSC data fetches, Supabase
 * queries, anything awaited inside a Server Component or server action.
 *
 * In development it logs `[perf:server] <label> <ms>` so you can see, per page
 * render, exactly how long each fetch took (cache hit vs miss, slow query, etc.).
 * In production it's a thin passthrough: the work still runs, but there's no
 * measurement or logging overhead.
 *
 * Usage:
 *   const { data } = await withTiming("home:popularRecipes", () =>
 *     supabase.from("recipes").select("*").limit(10),
 *   );
 */
export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (process.env.NODE_ENV !== "development") return fn();

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const ms = performance.now() - start;
    console.log(`[perf:server] ${label} ${ms.toFixed(1)}ms`);
  }
}
