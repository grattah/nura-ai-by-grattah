import { describe, it, expect, vi } from "vitest";

// The route module pulls in the Supabase server client (next/headers); stub it
// so importing the file doesn't blow up. We only test the pure sanitizeNext.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { sanitizeNext } from "@/app/(no-chrome)/auth/callback/route";

const ORIGIN = "https://app.test";

describe("sanitizeNext (open-redirect defense, audit M4)", () => {
  it("keeps same-origin relative paths", () => {
    expect(sanitizeNext("/account", ORIGIN)).toBe("/account");
    expect(sanitizeNext("/recipes/123?ref=x", ORIGIN)).toBe("/recipes/123?ref=x");
  });

  it("defaults to / for null/empty", () => {
    expect(sanitizeNext(null, ORIGIN)).toBe("/");
  });

  it("rejects absolute off-origin URLs", () => {
    expect(sanitizeNext("https://evil.com", ORIGIN)).toBe("/");
    expect(sanitizeNext("https://evil.com/path", ORIGIN)).toBe("/");
  });

  it("allows absolute same-origin URLs, reduced to path", () => {
    expect(sanitizeNext(`${ORIGIN}/safe?x=1`, ORIGIN)).toBe("/safe?x=1");
  });

  it("rejects protocol-relative and backslash tricks", () => {
    expect(sanitizeNext("//evil.com", ORIGIN)).toBe("/");
    expect(sanitizeNext("/\\evil.com", ORIGIN)).toBe("/");
  });

  it("rejects non-path inputs", () => {
    expect(sanitizeNext("javascript:alert(1)", ORIGIN)).toBe("/");
    expect(sanitizeNext("evil.com", ORIGIN)).toBe("/");
  });
});
