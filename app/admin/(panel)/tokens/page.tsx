import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { estimateCostUsd } from "@/lib/usage-pricing";
import {
  TokenUsageCharts,
  type DailyPoint,
  type ModelPoint,
  type SurfacePoint,
} from "@/components/admin/token-usage-charts";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
] as const;

interface Summary {
  calls: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  images: number;
  billedCalls: number;
  unbilledCalls: number;
  billedTokens: number;
  units: number;
}

interface SurfaceRow {
  surface: string;
  provider: string;
  model: string;
  calls: number;
  total_tokens: number;
  images: number;
}

interface ModelRow {
  provider: string;
  model: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  images: number;
}

interface DailyRow {
  day: string;
  calls: number;
  total_tokens: number;
  images: number;
}

interface TopUserRow {
  user_id: string;
  calls: number;
  total_tokens: number;
  images: number;
}

interface RecentRow {
  id: number;
  created_at: string;
  provider: string;
  model: string;
  surface: string;
  source: string;
  total_tokens: number;
  images: number;
  billed: boolean;
}

const fmt = (n: number) => n.toLocaleString();
const fmtUsd = (n: number) =>
  n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(3)}`;

export default async function TokensPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const days = range === "7" ? 7 : range === "90" ? 90 : 30;
  const activeRange = String(days);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const admin = createServiceRoleClient();
  const p = { p_since: since } as never;

  const [
    { data: summaryData },
    { data: surfaceData },
    { data: modelData },
    { data: dailyData },
    { data: topUserData },
    { data: recentData },
  ] = await Promise.all([
    admin.rpc("token_usage_summary" as never, p),
    admin.rpc("token_usage_by_surface" as never, p),
    admin.rpc("token_usage_by_model" as never, p),
    admin.rpc("token_usage_daily" as never, p),
    admin.rpc(
      "token_usage_top_users" as never,
      {
        p_since: since,
        p_limit: 10,
      } as never,
    ),
    admin
      .from("token_usage" as never)
      .select(
        "id, created_at, provider, model, surface, source, total_tokens, images, billed",
      )
      .gte("created_at" as never, since as never)
      .order("created_at" as never, { ascending: false })
      .limit(25),
  ]);

  const summary = (summaryData as Summary | null) ?? {
    calls: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    images: 0,
    billedCalls: 0,
    unbilledCalls: 0,
    billedTokens: 0,
    units: 0,
  };
  const surfaceRows = (surfaceData as SurfaceRow[] | null) ?? [];
  const modelRows = (modelData as ModelRow[] | null) ?? [];
  const dailyRows = (dailyData as DailyRow[] | null) ?? [];
  const topUsers = (topUserData as TopUserRow[] | null) ?? [];
  const recent = (recentData as RecentRow[] | null) ?? [];

  // ── Cost estimation ───────────────────────────────────────────────────────
  const byModel: ModelPoint[] = modelRows.map((r) => ({
    model: r.model,
    tokens: Number(r.total_tokens),
    cost: estimateCostUsd(r),
  }));
  const totalCost = byModel.reduce((s, m) => s + m.cost, 0);
  const blendedRate =
    summary.totalTokens > 0 ? totalCost / summary.totalTokens : 0;

  // Surface rows are grouped by (surface, provider, model) — fold to surface,
  // summing real per-model cost, then keep the biggest spenders.
  const surfaceMap = new Map<string, SurfacePoint>();
  for (const r of surfaceRows) {
    const cur = surfaceMap.get(r.surface) ?? {
      surface: r.surface,
      tokens: 0,
      cost: 0,
    };
    cur.tokens += Number(r.total_tokens);
    cur.cost += estimateCostUsd(r);
    surfaceMap.set(r.surface, cur);
  }
  const bySurface = [...surfaceMap.values()]
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 12);

  const daily: DailyPoint[] = dailyRows.map((r) => ({
    day: r.day,
    tokens: Number(r.total_tokens),
    cost: Number(r.total_tokens) * blendedRate,
  }));

  // Resolve top-user emails (service role).
  const userEmails = new Map<string, string>();
  await Promise.all(
    topUsers.map(async (u) => {
      const { data } = await admin.auth.admin.getUserById(u.user_id);
      if (data.user?.email) userEmails.set(u.user_id, data.user.email);
    }),
  );

  const kpis = [
    { label: "Total tokens", value: fmt(summary.totalTokens) },
    { label: "Est. cost", value: fmtUsd(totalCost) },
    { label: "Total calls", value: fmt(summary.calls) },
    { label: "Images", value: fmt(summary.images) },
    {
      label: "Billed / unbilled calls",
      value: `${fmt(summary.billedCalls)} / ${fmt(summary.unbilledCalls)}`,
    },
    { label: "Units charged", value: fmt(summary.units) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tokens</h1>
          <p className="text-sm text-muted-foreground">
            Every model, image, and embedding spend across the app — runtime,
            cron, and offline scripts. Costs are estimates.
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {RANGES.map((r) => {
            const active = activeRange === r.key;
            return (
              <Link
                key={r.key}
                href={`/admin/tokens?range=${r.key}`}
                className={
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-mint-green text-white"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {r.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-card border border-border rounded-3xl p-5"
          >
            <p className="text-2xl font-semibold text-foreground wrap-break-word">
              {k.value}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {summary.calls === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-8 text-center text-sm text-muted-foreground">
          No usage recorded in this window yet.
        </div>
      ) : (
        <TokenUsageCharts
          daily={daily}
          bySurface={bySurface}
          byModel={byModel}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top users */}
        <div className="bg-card border border-border rounded-3xl p-4 sm:p-5">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Top users by tokens
          </h2>
          {topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attributed usage.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">User</th>
                    <th className="py-2 px-3 font-medium text-right">Calls</th>
                    <th className="py-2 pl-3 font-medium text-right">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((u) => (
                    <tr key={u.user_id} className="border-t border-border">
                      <td className="py-2 pr-3 text-foreground break-all">
                        {userEmails.get(u.user_id) ??
                          `${u.user_id.slice(0, 8)}…`}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {fmt(Number(u.calls))}
                      </td>
                      <td className="py-2 pl-3 text-right text-foreground">
                        {fmt(Number(u.total_tokens))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent events */}
        <div className="bg-card border border-border rounded-3xl p-4 sm:p-5">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Recent events
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent events.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 px-3 font-medium">Surface</th>
                    <th className="py-2 px-3 font-medium">Model</th>
                    <th className="py-2 pl-3 font-medium text-right">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 px-3 text-foreground break-all">
                        {r.surface}
                        {!r.billed && (
                          <span className="ml-1 text-[10px] uppercase text-muted-foreground">
                            ·{r.source}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground break-all">
                        {r.model}
                      </td>
                      <td className="py-2 pl-3 text-right text-foreground">
                        {r.images > 0
                          ? `${fmt(Number(r.total_tokens))} +${r.images}🖼`
                          : fmt(Number(r.total_tokens))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
