import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeSupabaseMock } from "./helpers/supabase-mock";

const h = vi.hoisted(() => ({
  admin: null as ReturnType<typeof import("./helpers/supabase-mock").makeSupabaseMock> | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => h.admin!.client),
}));

import { POST } from "@/app/api/auth/check-email/route";

function post(email: string, ip: string) {
  return POST(
    new Request("http://test/api/auth/check-email", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ email }),
    }) as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  h.admin = makeSupabaseMock();
});

describe("check-email — RPC primary path (audit H2)", () => {
  it("returns exists/hasPassword from the RPC and never scans listUsers", async () => {
    h.admin!.client.rpc.mockResolvedValue({
      data: [{ account_exists: true, has_password: true }],
      error: null,
    });
    const res = await post("known@x.com", "10.0.0.1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ exists: true, hasPassword: true });
    expect(h.admin!.client.auth.admin.listUsers).not.toHaveBeenCalled();
  });

  it("reports a brand-new email as not existing", async () => {
    h.admin!.client.rpc.mockResolvedValue({ data: [], error: null });
    const res = await post("new@x.com", "10.0.0.2");
    expect(await res.json()).toEqual({ exists: false, hasPassword: false });
  });
});

describe("check-email — pagination fallback (audit H2)", () => {
  it("finds a user beyond the first page when the RPC is unavailable", async () => {
    // RPC not deployed yet → error → fall back to paginated listUsers.
    h.admin!.client.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });

    const firstPage = Array.from({ length: 1000 }, () => ({ email: "other@x.com" }));
    h.admin!.client.auth.admin.listUsers.mockImplementation(
      ({ page }: { page: number }) =>
        Promise.resolve({
          data: {
            users:
              page === 1
                ? firstPage
                : [{ email: "target@x.com", user_metadata: { has_password: true } }],
          },
          error: null,
        }),
    );

    const res = await post("target@x.com", "10.0.0.3");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ exists: true, hasPassword: true });
    expect(h.admin!.client.auth.admin.listUsers).toHaveBeenCalledTimes(2);
  });
});

describe("check-email — rate limiting (audit H1/H3)", () => {
  it("blocks after 5 requests/min from the same IP", async () => {
    h.admin!.client.rpc.mockResolvedValue({ data: [], error: null });
    const ip = "203.0.113.7";
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await post("x@x.com", ip)).status);
    expect(codes.filter((c) => c === 200).length).toBe(5);
    expect(codes.filter((c) => c === 429).length).toBe(2);
  });
});
