import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ADMIN_EMAIL, isAllowedAdminEmail } from "@/lib/admin/allowlist";

describe("admin allowlist", () => {
  it("accepts the one allowed address", () => {
    expect(isAllowedAdminEmail(ADMIN_EMAIL)).toBe(true);
  });

  it("is case- and whitespace-insensitive", () => {
    // A sign-in form yields whatever was typed; Supabase stores the address as
    // first supplied. Comparing raw strings would lock out the real admin.
    expect(isAllowedAdminEmail("  4808Enterprises@Gmail.COM ")).toBe(true);
  });

  it.each([
    ["a different address", "someone@else.com"],
    ["the previous admin", "latto@xmail.com"],
    ["a plus-address to the same inbox", "4808enterprises+admin@gmail.com"],
    ["the same local part on another domain", "4808enterprises@gmail.com.evil.com"],
    ["a prefix of the allowed address", "4808enterprises@gmail.co"],
    ["empty", ""],
    ["null", null],
    ["undefined", undefined],
  ])("rejects %s", (_why, email) => {
    expect(isAllowedAdminEmail(email)).toBe(false);
  });
});

// ── The boundary is server-side ─────────────────────────────────────────────
//
// Source assertions, because the alternative is rendering server components,
// which this suite cannot do. They catch the regression that matters: someone
// deleting the check from getAdminIdentity and leaving only the login form's
// copy, which any client can skip entirely.
describe("the gate is enforced in getAdminIdentity, not just the form", () => {
  const auth = readFileSync("lib/admin/auth.ts", "utf8");

  it("checks the allowlist before reading admin_members", () => {
    expect(auth).toContain("isAllowedAdminEmail(user.email)");
    const check = auth.indexOf("isAllowedAdminEmail(user.email)");
    const read = auth.indexOf('from("admin_members"');
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(read);
  });

  it("reads the email from the session, not from admin_members", () => {
    // admin_members.email is a copy written at invite time. Trusting it would
    // let a stale or edited row admit an address the session never proved.
    expect(auth).toMatch(/isAllowedAdminEmail\(user\.email\)/);
  });
});

// ── No password may reach the admin panel ───────────────────────────────────
describe("admin sign-in is one-time-code only", () => {
  const files = [
    "app/admin/login/page.tsx",
    "app/admin/signup/page.tsx",
    "app/admin/accept/page.tsx",
  ];

  it.each(files)("%s performs no password authentication", (path) => {
    const src = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).not.toMatch(/signInWithPassword|signUp\(/);
  });

  it("the login page sends a code and never creates a user", () => {
    const src = readFileSync("app/admin/login/page.tsx", "utf8");
    expect(src).toContain("signInWithOtp");
    expect(src).toContain("verifyOtp");
    // Without this, requesting a code for an unknown address would create an
    // account for it.
    expect(src).toMatch(/shouldCreateUser:\s*false/);
  });

  it("has no owner-bootstrap action left to create a password account", () => {
    // actions/admin-auth.ts gated a password-based owner creation on
    // "is admin_members empty?" — which is true again after any admin swap.
    expect(() => readFileSync("actions/admin-auth.ts", "utf8")).toThrow();
  });
});
