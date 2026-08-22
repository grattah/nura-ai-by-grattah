import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync, existsSync } from "node:fs";

const h = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  cancelScheduledDeletion: vi.fn(),
  headers: new Map<string, string>(),
}));

// redirect() throws in Next; model that so control flow is asserted honestly.
class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(h.headers),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({ auth: { verifyOtp: (...a: unknown[]) => h.verifyOtp(...a) } }),
}));

vi.mock("@/actions/delete-account", () => ({
  cancelScheduledDeletion: () => h.cancelScheduledDeletion(),
}));

import { confirmOtp } from "@/actions/confirm-otp";

/** Runs the action and returns the URL it redirected to. */
async function run(fields: Record<string, string>): Promise<string> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  try {
    await confirmOtp(fd);
  } catch (e) {
    if (e instanceof RedirectError) return e.url;
    throw e;
  }
  throw new Error("action did not redirect");
}

beforeEach(() => {
  vi.clearAllMocks();
  h.verifyOtp.mockResolvedValue({ error: null });
  h.headers = new Map([["origin", "https://nuko.health"]]);
});

// ── The regression itself ────────────────────────────────────────────────────
//
// /auth/confirm used to be a GET route handler that called verifyOtp. Mail
// security scanners fetch every link before the recipient opens the message,
// which burned the one-time token and left the real click on /auth/error.
// The token must only be consumable by a form submit.
describe("auth confirm — token is not consumable by GET", () => {
  const dir = "app/(no-chrome)/auth/confirm";

  it("exposes no route handler at /auth/confirm", () => {
    expect(existsSync(`${dir}/route.ts`)).toBe(false);
    expect(existsSync(`${dir}/route.tsx`)).toBe(false);
  });

  it("renders an interstitial that verifies nothing", () => {
    const page = readFileSync(`${dir}/page.tsx`, "utf8");
    expect(page).not.toContain("verifyOtp");
    // The token is handed back to the user as a form, not spent.
    expect(page).toContain("confirmOtp");
    expect(page).toContain('name="token_hash"');
  });
});

describe("confirmOtp", () => {
  it("verifies the token and sends recovery to the reset form", async () => {
    const url = await run({ token_hash: "th", type: "recovery", next: "/account" });

    expect(h.verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "th" });
    // Recovery ignores `next`: Supabase silently rewrites it to the Site URL
    // when the requested redirect isn't allow-listed.
    expect(url).toBe("/auth/update-password");
  });

  it("honours next for non-recovery links", async () => {
    expect(await run({ token_hash: "th", type: "email", next: "/account" })).toBe(
      "/account",
    );
  });

  it("recovers an account pending deletion", async () => {
    await run({ token_hash: "th", type: "recovery" });
    expect(h.cancelScheduledDeletion).toHaveBeenCalledTimes(1);
  });

  it("routes a failed verification to the error page", async () => {
    h.verifyOtp.mockResolvedValue({ error: { message: "Token has expired" } });

    const url = await run({ token_hash: "th", type: "recovery" });

    expect(url).toBe("/auth/error?error=Token%20has%20expired");
    expect(h.cancelScheduledDeletion).not.toHaveBeenCalled();
  });

  it("rejects a missing token without calling Supabase", async () => {
    expect(await run({ type: "recovery" })).toBe(
      "/auth/error?error=Missing+token+hash+or+type",
    );
    expect(h.verifyOtp).not.toHaveBeenCalled();
  });

  it("refuses an off-origin next (the hidden field is user-controlled)", async () => {
    expect(
      await run({ token_hash: "th", type: "email", next: "https://evil.com/x" }),
    ).toBe("/");
    expect(await run({ token_hash: "th", type: "email", next: "//evil.com" })).toBe("/");
  });
});
