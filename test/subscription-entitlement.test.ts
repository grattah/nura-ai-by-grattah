import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  ENTITLED_STATUSES,
  getEntitledSubscription,
  getActiveSubscription,
  hasActiveSubscription,
} from "@/lib/subscription";
import { getSubscriptionView } from "@/lib/subscription-state";

type Row = { plan: string; expires_at: string | null; status: string };

function mockDb(rows: Row[]) {
  const filters: { eq: string[]; in: string[][] } = { eq: [], in: [] };

  const builder = () => {
    let statuses: string[] | null = null;
    const b: Record<string, unknown> = {
      select: () => b,
      eq: (col: string, val: string) => {
        if (col === "status") {
          statuses = [val];
          filters.eq.push(val);
        }
        return b;
      },
      in: (col: string, vals: string[]) => {
        if (col === "status") {
          statuses = vals;
          filters.in.push(vals);
        }
        return b;
      },
      order: () => b,
      limit: () => b,
      then: (onF: (v: { data: Row[] }) => unknown) =>
        Promise.resolve({
          data: statuses ? rows.filter((r) => statuses!.includes(r.status)) : rows,
        }).then(onF),
    };
    return b;
  };

  const client = { from: vi.fn(builder) } as unknown as SupabaseClient<Database>;
  return { client, filters };
}

const future = new Date(Date.now() + 20 * 864e5).toISOString();
const past = new Date(Date.now() - 864e5).toISOString();

describe("entitlement survives cancellation", () => {
  it("keeps access for a cancelled subscription still inside its period", async () => {
    const { client } = mockDb([
      { plan: "monthly", expires_at: future, status: "cancelled" },
    ]);
    expect(await hasActiveSubscription(client, "u1")).toBe(true);
  });

  it("drops access once the paid period actually ends", async () => {
    const { client } = mockDb([
      { plan: "monthly", expires_at: past, status: "cancelled" },
    ]);
    expect(await hasActiveSubscription(client, "u1")).toBe(false);
  });

  it("still refuses a suspended subscription — the renewal payment failed", async () => {
    const { client } = mockDb([
      { plan: "monthly", expires_at: future, status: "suspended" },
    ]);
    expect(await hasActiveSubscription(client, "u1")).toBe(false);
  });

  it("queries both entitled statuses, not just active", async () => {
    const { client, filters } = mockDb([]);
    await getEntitledSubscription(client, "u1");
    expect(filters.in).toContainEqual([...ENTITLED_STATUSES]);
  });

  it("is not masked by a newer suspended row", async () => {
    const { client } = mockDb([
      { plan: "monthly", expires_at: future, status: "suspended" },
      { plan: "annual", expires_at: future, status: "active" },
    ]);
    expect(await hasActiveSubscription(client, "u1")).toBe(true);
  });
});

describe("billing occupancy stays 'active' only", () => {
  it("reports no active subscription for a cancelled-but-paid user", async () => {
    const { client, filters } = mockDb([
      { plan: "monthly", expires_at: future, status: "cancelled" },
    ]);
    expect(await getActiveSubscription(client, "u1")).toBeNull();
    expect(filters.eq).toContain("active");
  });
});

describe("getSubscriptionView", () => {
  it("shows a cancelled-but-paid user as active, not expired", async () => {
    const { client } = mockDb([
      { plan: "monthly", expires_at: future, status: "cancelled" },
    ]);
    const view = await getSubscriptionView(client, "u1");
    expect(view.state).toBe("active");
    expect(view.expiresAt).toBe(future);
  });

  it("shows expired once the period has passed", async () => {
    const { client } = mockDb([
      { plan: "monthly", expires_at: past, status: "cancelled" },
    ]);
    expect((await getSubscriptionView(client, "u1")).state).toBe("expired");
  });
});

describe("plan ordering and pricing", () => {
  it("lists weekly, monthly, annual in that order", async () => {
    const { PLANS } = await import("@/constants");
    expect(PLANS.map((p) => p.id)).toEqual(["weekly", "monthly", "annual"]);
  });

  it("badges only the annual plan", async () => {
    const { PLANS } = await import("@/constants");
    const badged = PLANS.filter((p) => p.badge);
    expect(badged).toHaveLength(1);
    expect(badged[0].id).toBe("annual");
  });

  it("keeps the annual saving consistent with the monthly price", async () => {
    const { PLANS } = await import("@/constants");
    const num = (s: string) => Number(s.replace(/[^0-9.]/g, ""));
    const monthly = num(PLANS.find((p) => p.id === "monthly")!.price);
    const annual = num(PLANS.find((p) => p.id === "annual")!.price);
    const claimed = num(
      PLANS.find((p) => p.id === "annual")!.description.match(/\$[\d.]+/)![0],
    );
    expect(claimed).toBeCloseTo(monthly * 12 - annual, 2);
  });
});
