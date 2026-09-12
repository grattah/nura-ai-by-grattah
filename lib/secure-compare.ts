import { timingSafeEqual } from "node:crypto";

// Constant-time comparison so secret checks don't leak timing.
import { createHash } from "node:crypto";

export function secureCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
  const da = createHash("sha256").update(a).digest();
  const db = createHash("sha256").update(b).digest();
  return timingSafeEqual(da, db);
}
