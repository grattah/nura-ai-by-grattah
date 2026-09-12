import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ADMIN_EMAIL, isAllowedAdminEmail } from "@/lib/admin/allowlist";

describe("admin allowlist", () => {
  it("accepts the one allowed address", () => {
    expect(isAllowedAdminEmail(ADMIN_EMAIL)).toBe(true);
  });

  it("is case- and whitespace-insensitive", () => {
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
    // let a stale or edited row admit an address the session never proved.
    expect(auth).toMatch(/isAllowedAdminEmail\(user\.email\)/);
  });
});

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
    expect(src).toMatch(/shouldCreateUser:\s*false/);
  });

  it("has no owner-bootstrap action left to create a password account", () => {
    expect(() => readFileSync("actions/admin-auth.ts", "utf8")).toThrow();
  });
});
