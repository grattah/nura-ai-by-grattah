import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeSupabaseMock } from "./helpers/supabase-mock";

const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  admin: null as ReturnType<typeof import("./helpers/supabase-mock").makeSupabaseMock> | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: h.getUser } }),
  ),
  createServiceRoleClient: vi.fn(() => h.admin!.client),
}));

import { POST } from "@/app/api/rag/save-questions/route";

const VALID_ID = "11111111-1111-1111-1111-111111111111";

function post(body: unknown) {
  return POST(
    new Request("http://test/api/rag/save-questions", {
      method: "POST",
      body: JSON.stringify(body),
    }) as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  h.admin = makeSupabaseMock();
});

describe("rag/save-questions — authz (audit C1)", () => {
  it("rejects unauthenticated callers with 401 and no DB access", async () => {
    h.getUser.mockResolvedValue({ data: { user: null } });
    const res = await post({
      contextId: VALID_ID,
      contextType: "recipe",
      questions: ["q1"],
    });
    expect(res.status).toBe(401);
    expect(h.admin!.calls.length).toBe(0);
  });

  it("rejects an invalid payload with 400 (authenticated)", async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await post({ contextId: "not-a-uuid", contextType: "recipe", questions: [] });
    expect(res.status).toBe(400);
  });
});

describe("rag/save-questions — fill-once (audit C1 IDOR)", () => {
  beforeEach(() => h.getUser.mockResolvedValue({ data: { user: { id: "u1" } } }));

  it("does NOT overwrite questions that are already cached", async () => {
    h.admin!.setResult("recipes", {
      data: { id: VALID_ID, follow_up_questions: ["existing"] },
      error: null,
    });
    const res = await post({
      contextId: VALID_ID,
      contextType: "recipe",
      questions: ["malicious-overwrite"],
    });
    expect(res.status).toBe(200);
    expect((await res.json()).skipped).toBe(true);
    expect(h.admin!.callsFor("recipes", "update").length).toBe(0);
  });

  it("writes when no questions are cached yet", async () => {
    h.admin!.setResult("recipes", {
      data: { id: VALID_ID, follow_up_questions: null },
      error: null,
    });
    const res = await post({
      contextId: VALID_ID,
      contextType: "recipe",
      questions: ["q1", "q2"],
    });
    expect(res.status).toBe(200);
    const updates = h.admin!.callsFor("recipes", "update");
    expect(updates.length).toBe(1);
    expect((updates[0].value as { follow_up_questions: string[] }).follow_up_questions).toEqual([
      "q1",
      "q2",
    ]);
  });

  it("returns 404 for an unknown contextId", async () => {
    h.admin!.setResult("recipes", { data: null, error: null });
    const res = await post({
      contextId: VALID_ID,
      contextType: "recipe",
      questions: ["q1"],
    });
    expect(res.status).toBe(404);
    expect(h.admin!.callsFor("recipes", "update").length).toBe(0);
  });
});
