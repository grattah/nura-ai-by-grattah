import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison for secrets (cron tokens, bootstrap secrets).
 * A plain `===` short-circuits at the first differing byte, which leaks prefix
 * length via response timing. Hashless approach: length-equalize by hashing is
 * unnecessary here — compare fixed-length SHA-256 digests of both inputs so
 * differing lengths are also safe.
 */
import { createHash } from "node:crypto";

export function secureCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
  const da = createHash("sha256").update(a).digest();
  const db = createHash("sha256").update(b).digest();
  return timingSafeEqual(da, db);
}
