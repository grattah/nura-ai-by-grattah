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
