import { describe, it, expect } from "vitest";
import {
  DELETION_GRACE_DAYS,
  deletionDeadline,
  daysUntilDeletion,
  isPastGracePeriod,
  signedInSinceScheduling,
} from "@/lib/account-deletion";

const DAY = 24 * 60 * 60 * 1000;
const SCHEDULED = "2026-07-30T10:00:00.000Z";
const at = (offsetDays: number) =>
  new Date(new Date(SCHEDULED).getTime() + offsetDays * DAY);

describe("grace period", () => {
  it("is 30 days", () => {
    expect(DELETION_GRACE_DAYS).toBe(30);
  });

  it("puts the deadline exactly 30 days after the request", () => {
    expect(deletionDeadline(SCHEDULED).toISOString()).toBe(
      "2026-08-29T10:00:00.000Z",
    );
  });

  it("counts down whole days", () => {
    expect(daysUntilDeletion(SCHEDULED, at(0))).toBe(30);
    expect(daysUntilDeletion(SCHEDULED, at(29))).toBe(1);
  });

  it("floors the countdown at zero rather than going negative", () => {
    expect(daysUntilDeletion(SCHEDULED, at(30))).toBe(0);
    expect(daysUntilDeletion(SCHEDULED, at(45))).toBe(0);
  });
});

describe("isPastGracePeriod", () => {
  it("is false throughout the grace period", () => {
    expect(isPastGracePeriod(SCHEDULED, at(0))).toBe(false);
    expect(isPastGracePeriod(SCHEDULED, at(29.99))).toBe(false);
  });

  it("is true from the deadline onward", () => {
    // Boundary matters: this is what authorises destroying the account.
    expect(isPastGracePeriod(SCHEDULED, at(30))).toBe(true);
    expect(isPastGracePeriod(SCHEDULED, at(31))).toBe(true);
  });
});

// The cron's safety net — GoTrue maintains last_sign_in_at, so this holds even if
// a sign-in path forgets to call cancelScheduledDeletion().
describe("signedInSinceScheduling", () => {
  it("detects a sign-in after the request", () => {
    expect(signedInSinceScheduling(SCHEDULED, at(3).toISOString())).toBe(true);
  });

  it("ignores the sign-in that preceded the request", () => {
    expect(signedInSinceScheduling(SCHEDULED, at(-1).toISOString())).toBe(false);
  });

  it("treats the scheduling instant itself as not a return", () => {
    // The session that requested deletion signed in at or before that moment.
    expect(signedInSinceScheduling(SCHEDULED, SCHEDULED)).toBe(false);
  });

  it("handles a missing or unparseable last_sign_in_at", () => {
    expect(signedInSinceScheduling(SCHEDULED, null)).toBe(false);
    expect(signedInSinceScheduling(SCHEDULED, undefined)).toBe(false);
    expect(signedInSinceScheduling(SCHEDULED, "not a date")).toBe(false);
  });

  it("still recovers an account that returned after the deadline", () => {
    // Ordering matters in the cron: the return check runs BEFORE the deadline
    // check, so a late sign-in beats a lapsed grace period.
    const late = at(40).toISOString();
    expect(isPastGracePeriod(SCHEDULED, at(40))).toBe(true);
    expect(signedInSinceScheduling(SCHEDULED, late)).toBe(true);
  });
});
