import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeSupabaseMock } from "./helpers/supabase-mock";

// Shared mock fns + a mutable context for the two Supabase clients the route uses.
const h = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  retrieve: vi.fn(),
  list: vi.fn(),
  headerSig: null as string | null,
  events: null as ReturnType<typeof import("./helpers/supabase-mock").makeSupabaseMock> | null,
  subs: null as ReturnType<typeof import("./helpers/supabase-mock").makeSupabaseMock> | null,
}));

vi.mock("stripe", () => ({
  default: vi.fn(() => ({
    webhooks: { constructEvent: h.constructEvent },
    subscriptions: { retrieve: h.retrieve, list: h.list },
  })),
}));

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve({ get: () => h.headerSig }),
}));

// The dedup ("events") client is created via @supabase/supabase-js createClient.
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => h.events!.client),
}));

// The subscriptions client is the service-role client.
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => h.subs!.client),
  createClient: vi.fn(),
}));

// Email sends are best-effort; stub so no real Resend call happens.
const sendEmail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email/send", () => ({ sendEmail }));

import { POST } from "@/app/api/webhooks/stripe/route";

const SECONDS = (daysFromNow: number) =>
  Math.floor(Date.now() / 1000) + daysFromNow * 86_400;

function subscriptionWith(periodEndSeconds: number, status = "active") {
  return {
    id: "sub_1",
    status,
    items: { data: [{ current_period_end: periodEndSeconds }] },
  };
}

function post(body = "{}") {
  return POST(new Request("http://test/api/webhooks/stripe", { method: "POST", body }));
}

beforeEach(() => {
  vi.clearAllMocks();
  h.headerSig = "valid_sig";
  h.events = makeSupabaseMock();
  h.subs = makeSupabaseMock();
  // generateLink for the welcome email.
  (h.subs.client.auth.admin as Record<string, unknown>).generateLink = vi.fn(() =>
    Promise.resolve({ data: { properties: { action_link: "https://link" } } }),
  );
  // Default: dedup insert succeeds (first time we see the event).
  h.events.setResult("stripe_webhook_events", { data: null, error: null });
  // Default: Stripe reports a single subscription (a first-time customer).
  h.list.mockResolvedValue({ data: [{ id: "sub_1" }] });
  h.retrieve.mockResolvedValue(subscriptionWith(SECONDS(30)));
});

describe("Stripe webhook — signature (audit: forged events)", () => {
  it("rejects a missing signature with 400 and no DB write", async () => {
    h.headerSig = null;
    const res = await post();
    expect(res.status).toBe(400);
    expect(h.constructEvent).not.toHaveBeenCalled();
    expect(h.subs!.callsFor("subscriptions").length).toBe(0);
  });

  it("rejects a forged signature with 400 and no DB write", async () => {
    h.constructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });
    const res = await post("tampered");
    expect(res.status).toBe(400);
    expect(h.subs!.callsFor("subscriptions").length).toBe(0);
    expect(h.events!.callsFor("stripe_webhook_events", "insert").length).toBe(0);
  });
});

describe("Stripe webhook — entitlement integrity (audit C2)", () => {
  it("sets expires_at from the real period end for a MONTHLY plan (≈1 month, not 1 year)", async () => {
    h.constructEvent.mockReturnValue({
      id: "evt_monthly",
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: "cs_1",
          client_reference_id: "user_1",
          customer: "cus_1",
          subscription: "sub_1",
          customer_details: { email: "a@b.com" },
          metadata: { plan: "monthly" },
        },
      },
    });
    h.retrieve.mockResolvedValue(subscriptionWith(SECONDS(30)));

    const res = await post();
    expect(res.status).toBe(200);

    const upserts = h.subs!.callsFor("subscriptions", "upsert");
    expect(upserts.length).toBe(1);
    const row = upserts[0].value as { plan: string; expires_at: string };
    expect(row.plan).toBe("monthly");

    const days = (new Date(row.expires_at).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(20);
    expect(days).toBeLessThan(60); // crucially NOT ~365
  });
});

describe("Stripe webhook — idempotency (audit M2)", () => {
  it("ignores a replayed event (dedup unique violation) without reprocessing", async () => {
    h.events!.setResult("stripe_webhook_events", {
      data: null,
      error: { code: "23505" },
    });
    h.constructEvent.mockReturnValue({
      id: "evt_dupe",
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      data: { object: { client_reference_id: "user_1", subscription: "sub_1" } },
    });

    const res = await post();
    expect(res.status).toBe(200);
    // Handler must NOT run: no subscription upsert.
    expect(h.subs!.callsFor("subscriptions", "upsert").length).toBe(0);
    expect(h.retrieve).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook — ordering (audit M2)", () => {
  it("does NOT resurrect a cancelled subscription from a stale active update", async () => {
    // Our DB already has this subscription cancelled.
    h.subs!.setResult("subscriptions", { data: [{ status: "cancelled" }], error: null });
    h.constructEvent.mockReturnValue({
      id: "evt_stale",
      type: "customer.subscription.updated",
      created: Math.floor(Date.now() / 1000),
      // Stale event: status active but the period already ended in the past.
      data: { object: subscriptionWith(SECONDS(-5), "active") },
    });

    const res = await post();
    expect(res.status).toBe(200);
    // The guard must skip the update entirely.
    expect(h.subs!.callsFor("subscriptions", "update").length).toBe(0);
  });

  it("applies cancellation on subscription.deleted", async () => {
    h.constructEvent.mockReturnValue({
      id: "evt_del",
      type: "customer.subscription.deleted",
      created: Math.floor(Date.now() / 1000),
      data: { object: { id: "sub_1" } },
    });

    const res = await post();
    expect(res.status).toBe(200);
    const updates = h.subs!.callsFor("subscriptions", "update");
    expect(updates.length).toBe(1);
    expect((updates[0].value as { status: string }).status).toBe("cancelled");
  });
});


// ── Resubscribe detection (QA: first subscription said "resubscribed") ───────
//
// /return calls activateSubscriptionFromSession() synchronously, so by the time
// this webhook runs a subscriptions row for the user ALREADY EXISTS — written by
// this same checkout. The old check read that row and concluded "returning
// customer". Detection now asks Stripe, which is the only party that can tell
// a first subscription from a second.
describe("Stripe webhook — first-time vs resubscribe email", () => {
  function checkoutEvent() {
    h.constructEvent.mockReturnValue({
      id: "evt_sub_1",
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: "cs_1",
          client_reference_id: "user_1",
          customer: "cus_1",
          customer_details: { email: "a@b.com" },
          metadata: { plan: "monthly" },
          subscription: "sub_1",
          amount_total: 999,
          currency: "usd",
        },
      },
    });
  }

  it("sends the FIRST-TIME email even though /return already wrote the row", async () => {
    // The regression: a row exists for this user before the webhook runs.
    h.subs!.setResult("subscriptions", { data: [{ status: "active" }], error: null });
    h.list.mockResolvedValue({ data: [{ id: "sub_1" }] }); // Stripe: only ever one
    checkoutEvent();

    await post();

    const subjects = sendEmail.mock.calls.map((c) => c[0]?.subject);
    expect(subjects).toContain("Your Nuko subscription is active ✨");
    expect(subjects).not.toContain("Welcome back to Nuko ✨");
  });

  it("sends the WELCOME BACK email when Stripe shows a prior subscription", async () => {
    h.list.mockResolvedValue({ data: [{ id: "sub_old" }, { id: "sub_1" }] });
    checkoutEvent();

    await post();

    const subjects = sendEmail.mock.calls.map((c) => c[0]?.subject);
    expect(subjects).toContain("Welcome back to Nuko ✨");
  });

  it("falls back to first-time copy when the Stripe lookup fails", async () => {
    // Erring toward "first-time" is the smaller wrong of the two.
    h.list.mockRejectedValue(new Error("stripe down"));
    checkoutEvent();

    await post();

    const subjects = sendEmail.mock.calls.map((c) => c[0]?.subject);
    expect(subjects).not.toContain("Welcome back to Nuko ✨");
  });
});
