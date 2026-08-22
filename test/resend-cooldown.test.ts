import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  secondsRemaining,
  RESEND_COOLDOWN_SECONDS,
} from "@/hooks/use-resend-cooldown";

describe("resend cooldown timing", () => {
  const t0 = 1_000_000;
  const deadline = t0 + RESEND_COOLDOWN_SECONDS * 1000;

  it("is a full minute", () => {
    expect(RESEND_COOLDOWN_SECONDS).toBe(60);
  });

  it("holds for the whole window", () => {
    expect(secondsRemaining(deadline, t0)).toBe(60);
    expect(secondsRemaining(deadline, t0 + 20_000)).toBe(40);
    expect(secondsRemaining(deadline, t0 + 59_500)).toBe(1);
  });

  it("releases exactly at the deadline", () => {
    expect(secondsRemaining(deadline, deadline)).toBe(0);
  });

  it("never goes negative when a tab was backgrounded past the deadline", () => {
    // Timers are throttled in background tabs, so the next tick can land long
    // after the deadline; recomputing from the deadline must still clamp at 0.
    expect(secondsRemaining(deadline, deadline + 600_000)).toBe(0);
  });
});

describe("forgot-password form", () => {
  const src = readFileSync("components/auth/forgot-password-form.tsx", "utf8");

  it("disables the resend button while cooling down", () => {
    expect(src).toContain("disabled={isLoading || isCoolingDown}");
  });

  it("guards the send itself, not just the button", () => {
    // A disabled button alone is a UI-only guard; the handler must refuse too.
    expect(src).toContain("if (isCoolingDown) return;");
  });

  it("starts the clock on the first send, not only on resends", () => {
    expect(src).toContain("startCooldown();");
  });
});

// Entitlement is decided in one place. An inline `status === "active"` check
// silently paywalls users who cancelled mid-period but are still paid up.
describe("no inline entitlement checks", () => {
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((e) => {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) return walk(full);
      return /\.tsx?$/.test(full) ? [full] : [];
    });
  }

  const ALLOWED = new Set([
    // Billing occupancy, deliberately 'active' only — see lib/subscription.ts.
    "lib/subscription.ts",
    "actions/cancel-subscription.ts",
    "app/api/cron/purge-deleted-accounts/route.ts",
    "app/(no-chrome)/review-order/review-order-client.tsx",
    "components/auth/auth-form.tsx",
    // Maps STRIPE's subscription status, not ours.
    "app/api/webhooks/stripe/route.ts",
  ]);

  it("has no unreviewed status === 'active' gates", () => {
    const offenders = [...walk("app"), ...walk("lib"), ...walk("actions")]
      .filter((f) => !ALLOWED.has(f))
      .filter((f) => {
        const src = readFileSync(f, "utf8");
        return /status\s*===\s*"active"|\.eq\(\s*"status",\s*"active"\s*\)/.test(src);
      });
    expect(offenders).toEqual([]);
  });
});
