import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isPasswordValid, PASSWORD_REQUIREMENTS } from "@/lib/password-policy";

describe("password policy", () => {
  it("accepts a password meeting every requirement", () => {
    expect(isPasswordValid("Nuko!2026")).toBe(true);
  });

  it.each([
    ["too short", "Nk!2a"],
    ["no uppercase", "nuko!2026"],
    ["no lowercase", "NUKO!2026"],
    ["no number", "NukoPass!"],
    ["no special character", "NukoPass2026"],
  ])("rejects a password with %s", (_why, password) => {
    expect(isPasswordValid(password)).toBe(false);
  });

  it("states five requirements to the user", () => {
    expect(PASSWORD_REQUIREMENTS).toHaveLength(5);
  });
});

// ── QA ⑬: a password is mandatory at signup ─────────────────────────────────
//
// The signup step used to carry a "Do this later" button wired to
// handleSkipProfile, which finished onboarding with no password set and
// has_password left undefined. Those accounts could only ever sign in by OTP.
describe("signup requires a password", () => {
  const form = readFileSync("components/auth/auth-form.tsx", "utf8");

  // A single button doing "save password" AND "skip the name" conflated two
  // responsibilities and read as an opt-out of the step. Both fields are
  // mandatory; there is no skip.
  it("offers no way to skip the signup step", () => {
    expect(form).not.toContain("Do this later");
    expect(form).not.toContain("handleSkipProfile");
  });

  it("requires both a name and a valid password to submit", () => {
    expect(form).toContain("isLoading || !fullName || !isPasswordValid(password)");
  });

  it("gates the submit button on the full policy, not just a length check", () => {
    expect(form).toContain("!isPasswordValid(password)");
    expect(form).not.toContain('"Password must be at least 8 characters."');
  });
});

// The policy is only real if the server enforces it — the reset form calls
// supabase.auth.updateUser straight from the client.
describe("server-side enforcement", () => {
  it("checks the shared policy in updatePassword", () => {
    const actions = readFileSync("actions/profile.ts", "utf8");
    expect(actions).toContain("isPasswordValid(newPassword)");
    expect(actions).not.toContain("newPassword.length < 8");
  });
});
