import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  verifyThrows: false,
}));

// Verify just parses the body unless we force a failure (bad signature).
vi.mock("standardwebhooks", () => ({
  Webhook: class {
    verify(body: string) {
      if (h.verifyThrows) throw new Error("invalid signature");
      return JSON.parse(body);
    }
  },
}));

vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve({ get: () => "x" } as unknown as Headers),
}));

vi.mock("@/lib/email/send", () => ({ sendEmail: (...a: unknown[]) => h.sendEmail(...a) }));

import { POST } from "@/app/api/auth/send-email/route";

function post(payload: unknown) {
  return POST(
    new Request("http://test/api/auth/send-email", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

const base = {
  user: { email: "user@example.com" },
  email_data: {
    token: "12345678",
    token_hash: "hash_abc",
    redirect_to: "",
    email_action_type: "magiclink",
    site_url: "https://app.test",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  h.verifyThrows = false;
});

describe("send-email auth hook", () => {
  it("rejects a bad signature with 401 and sends nothing", async () => {
    h.verifyThrows = true;
    const res = await post(base);
    expect(res.status).toBe(401);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("sends an OTP code email for magiclink", async () => {
    const res = await post(base);
    expect(res.status).toBe(200);
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    const arg = h.sendEmail.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(arg.to).toBe("user@example.com");
    expect(arg.subject).toMatch(/verification code/i);
    expect(arg.html).toContain("12345678");
  });

  it("sends a reset link email for recovery", async () => {
    const res = await post({
      ...base,
      email_data: { ...base.email_data, email_action_type: "recovery" },
    });
    expect(res.status).toBe(200);
    const arg = h.sendEmail.mock.calls[0][0] as { html: string; subject: string };
    expect(arg.subject).toMatch(/reset/i);
    expect(arg.html).toContain("/auth/confirm");
    expect(arg.html).toContain("type=recovery");
  });

  it("returns 500 when the send fails (so Supabase retries)", async () => {
    h.sendEmail.mockRejectedValueOnce(new Error("resend down"));
    const res = await post(base);
    expect(res.status).toBe(500);
  });
});
