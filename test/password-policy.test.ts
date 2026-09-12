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

describe("signup requires a password", () => {
  const form = readFileSync("components/auth/auth-form.tsx", "utf8");

  it("offers no way to skip the signup step", () => {
    expect(form).not.toContain("Do this later");
    expect(form).not.toContain("handleSkipProfile");
  });

  it("gates the submit button on a single computed condition", () => {
    expect(form).toMatch(/disabled=\{\s*canCreateProfileDisabled\s*\}/);
  });

  it("requires both a name and a fully valid password to submit", () => {
    const gate = form.slice(
      form.indexOf("const canCreateProfileDisabled"),
      form.indexOf("isLoading;", form.indexOf("const canCreateProfileDisabled")),
    );
    expect(gate).toContain("!fullName");
    expect(gate).toContain("isPasswordValid(strength)");
  });

  it("no longer settles for a length-only message", () => {
    expect(form).not.toContain('"Password must be at least 8 characters."');
  });

  it("enforces the same policy in the submit handler, not just the button", () => {
    expect(form).toContain("isRawPasswordValid(password)");
  });
});

describe("server-side enforcement", () => {
  it("checks the shared policy in updatePassword", () => {
    const actions = readFileSync("actions/profile.ts", "utf8");
    expect(actions).toContain("isPasswordValid(newPassword)");
    expect(actions).not.toContain("newPassword.length < 8");
  });
});
