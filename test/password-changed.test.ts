import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  user: null as { id: string; email: string } | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: () => Promise.resolve({ data: { user: h.user } }) },
    }),
}));

vi.mock("@/lib/email/send", () => ({
  sendEmail: (...a: unknown[]) => h.sendEmail(...a),
}));

import { sendPasswordChangedEmail } from "@/actions/password-changed";

beforeEach(() => {
  vi.clearAllMocks();
  h.user = { id: "u1", email: "jane@example.com" };
});

describe("sendPasswordChangedEmail", () => {
  it("sends a confirmation email to the authenticated user", async () => {
    await sendPasswordChangedEmail();

    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    const [{ to, subject }] = h.sendEmail.mock.calls[0];
    expect(to).toBe("jane@example.com");
    expect(subject).toMatch(/password was changed/i);
  });

  it("does nothing without an authenticated user", async () => {
    h.user = null;
    await sendPasswordChangedEmail();
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("swallows send failures", async () => {
    h.sendEmail.mockRejectedValueOnce(new Error("resend down"));
    await expect(sendPasswordChangedEmail()).resolves.toBeUndefined();
  });
});
