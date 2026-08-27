import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { REQUIRED_EVENTS } from "@/lib/stripe/webhook-health";

// Renewal and payment-failure emails never sent, because
// `invoice.payment_succeeded` and `invoice.payment_failed` were not among the
// Stripe endpoint's enabled events. The handlers existed and were correct;
// Stripe was never asked to deliver to them.
//
// The monitoring that surfaces that is only as good as its list of what SHOULD
// arrive. If someone adds a `case` to the webhook without adding it here, the
// new handler is unmonitored and can fail exactly as silently — so the list is
// derived from the route file rather than trusted.
describe("REQUIRED_EVENTS matches the webhook's actual handlers", () => {
  const route = readFileSync("app/api/webhooks/stripe/route.ts", "utf8");

  // Every `case "…":` in the event switch.
  const handled = [...route.matchAll(/case\s+"([a-z_]+\.[a-z_.]+)":/g)].map(
    (m) => m[1],
  );

  it("finds the handlers in the route", () => {
    expect(handled.length, "no `case` blocks found — did the switch change shape?")
      .toBeGreaterThan(0);
  });

  it("monitors every event the webhook handles", () => {
    const unmonitored = handled.filter(
      (t) => !(REQUIRED_EVENTS as readonly string[]).includes(t),
    );
    expect(
      unmonitored,
      "these are handled but absent from REQUIRED_EVENTS, so nothing would notice if Stripe stopped sending them",
    ).toEqual([]);
  });

  it("does not monitor events nothing handles", () => {
    const orphaned = (REQUIRED_EVENTS as readonly string[]).filter(
      (t) => !handled.includes(t),
    );
    expect(
      orphaned,
      "these are monitored but no longer handled — the panel would demand an event the app ignores",
    ).toEqual([]);
  });

  it("includes the two that were missing in production", () => {
    expect(REQUIRED_EVENTS).toContain("invoice.payment_succeeded");
    expect(REQUIRED_EVENTS).toContain("invoice.payment_failed");
  });
});
