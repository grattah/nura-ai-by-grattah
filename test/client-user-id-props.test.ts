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

/**
 * Components that may still take a userId, with the reason. Anything not listed
 * here must read the id from the session via getCurrentUserId().
 */
const ALLOWED = new Map<string, string>([
  [
    "components/tokens/FreeTokensModal.tsx",
    // Namespaces a localStorage key and nothing else — no query is filtered by
    // it and the claim_free_tokens_redirect RPC resolves the user server-side.
    // Worst case for a wrong value is re-showing a welcome modal. Deriving it
    // asynchronously would delay the modal for no security gain.
    "localStorage cache key only; server RPC is authoritative",
  ],
]);

// QA ①: client components took `userId` from their server parent. RLS was
// always the real boundary (verified: every table involved restricts rows to
// auth.uid(), and the avatars bucket requires foldername(name)[1] = auth.uid()),
// so this was never exploitable — but a prop baked into the RSC payload goes
// stale when the session changes, which silently emptied lists and made avatar
// uploads fail an opaque storage policy.
describe("client components don't take userId as a prop", () => {
  const offenders = walk("components")
    .filter((file) => {
      const src = readFileSync(file, "utf8");
      if (!src.includes('"use client"')) return false;
      // A `userId` in the props type or destructured signature.
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
