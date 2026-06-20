import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeSupabaseMock } from "./helpers/supabase-mock";

const h = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  user: null as { id: string; email: string; user_metadata?: unknown } | null,
  admin: null as ReturnType<typeof import("./helpers/supabase-mock").makeSupabaseMock> | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: () => Promise.resolve({ data: { user: h.user } }) },
    }),
  createServiceRoleClient: () => h.admin!.client,
}));

vi.mock("@/lib/email/send", () => ({
  sendEmail: (...a: unknown[]) => h.sendEmail(...a),
}));

import { ensureWelcomeEmail } from "@/actions/welcome";

beforeEach(() => {
  vi.clearAllMocks();
  h.user = {
    id: "u1",
    email: "jane@example.com",
    user_metadata: { full_name: "Jane Doe" },
  };
  h.admin = makeSupabaseMock();
});

describe("ensureWelcomeEmail", () => {
  it("sends and stamps welcomed_at when not yet welcomed", async () => {
    h.admin!.setResult("profiles", { data: { welcomed_at: null }, error: null });

    await ensureWelcomeEmail();

    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    const updates = h.admin!.callsFor("profiles", "update");
    expect(updates.length).toBe(1);
    expect((updates[0].value as { welcomed_at?: string }).welcomed_at).toBeTruthy();
  });

  it("is a no-op when already welcomed", async () => {
    h.admin!.setResult("profiles", {
      data: { welcomed_at: "2026-01-01T00:00:00Z" },
      error: null,
    });

    await ensureWelcomeEmail();

    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(h.admin!.callsFor("profiles", "update").length).toBe(0);
  });

  it("does nothing without an authenticated user", async () => {
    h.user = null;
    await ensureWelcomeEmail();
    expect(h.sendEmail).not.toHaveBeenCalled();
  });
});
