import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

const ALLOWED = new Map<string, string>([
  [
    "components/tokens/FreeTokensModal.tsx",
    "localStorage cache key only; server RPC is authoritative",
  ],
]);

describe("client components don't take userId as a prop", () => {
  const offenders = walk("components")
    .filter((file) => {
      const src = readFileSync(file, "utf8");
      if (!src.includes('"use client"')) return false;
      return /\buserId(\?)?:\s*string/.test(src);
    })
    .filter((file) => !ALLOWED.has(file));

  it("has no unreviewed userId props", () => {
    expect(offenders).toEqual([]);
  });

  it.each([
    "components/bookmarks/BookmarkList.tsx",
    "components/community/CommunityFeed.tsx",
    "components/profile/avatar-upload.tsx",
  ])("%s resolves the id from the session", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src).toContain("getCurrentUserId");
  });
});
