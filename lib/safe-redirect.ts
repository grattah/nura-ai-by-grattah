export function sanitizeNext(raw: string | null, origin: string): string {
  const fallback = "/";
  if (!raw) return fallback;
  try {
    if (raw.startsWith("http")) {
      const url = new URL(raw);
      return url.origin === origin ? url.pathname + url.search : fallback;
    }
    if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) {
      return raw;
    }
  } catch {
    return fallback;
  }
  return fallback;
}
