/**
 * Only allow same-origin, relative redirect targets (audit M4). Anything
 * absolute, protocol-relative (`//evil.com`), or off-origin collapses to "/".
 */
export function sanitizeNext(raw: string | null, origin: string): string {
  const fallback = "/";
  if (!raw) return fallback;
  try {
    if (raw.startsWith("http")) {
      const url = new URL(raw);
      return url.origin === origin ? url.pathname + url.search : fallback;
    }
    // Must be a single-slash absolute path; reject `//host` and `/\` tricks.
    if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) {
      return raw;
    }
  } catch {
    return fallback;
  }
  return fallback;
}
