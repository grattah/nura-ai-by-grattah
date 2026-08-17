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
  // The split matters: without it estimateCostUsd blends the input and output
  // rates, which overstates every surface (worst on input-heavy work at
  // Sonnet's 5x output premium) and let one surface exceed the page total.
  input_tokens: number;
  output_tokens: number;
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
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  images: number;
  billed: boolean;
  /** Credits actually deducted. Null on unbilled calls — see `billed`. */
  units: number | null;
  /** Null for offline/cron work that isn't attributable to an account. */
  user_id: string | null;
}

const fmt = (n: number) => n.toLocaleString();
const fmtUsd = (n: number) =>
  n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(3)}`;
// A single call costs a fraction of a cent, so the per-event column needs finer
// precision than the aggregate KPIs — 3dp would render most rows as "$0.006".
const fmtUsdPrecise = (n: number) => {
  if (n === 0) return "$0";
  if (n < 0.0001) return "<$0.0001";
  return `$${n.toFixed(4)}`;
};

// Preserve the range + both tables' page indices across pagination links.
function tokensHref(range: string, usersPage: number, eventsPage: number) {
  const sp = new URLSearchParams({ range });
  if (usersPage > 1) sp.set("up", String(usersPage));
  if (eventsPage > 1) sp.set("ep", String(eventsPage));
  return `/admin/tokens?${sp.toString()}`;
}

function Pager({
  page,
  hasNext,
  hrefFor,
}: {
  page: number;
  hasNext: boolean;
  hrefFor: (page: number) => string;
}) {
  if (page === 1 && !hasNext) return null;
  const btn =
    "rounded-md border border-border px-2.5 py-1 transition-colors hover:bg-muted";
  const disabled = "rounded-md border border-border px-2.5 py-1 opacity-40";
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
      <span>Page {page}</span>
      <div className="flex gap-1">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={btn} scroll={false}>
            Prev
          </Link>
        ) : (
          <span className={disabled}>Prev</span>
        )}
        {hasNext ? (
          <Link href={hrefFor(page + 1)} className={btn} scroll={false}>
            Next
          </Link>
        ) : (
          <span className={disabled}>Next</span>
        )}
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

export default async function TokensPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; up?: string; ep?: string }>;
}) {
  const { range, up, ep } = await searchParams;
  const days = range === "7" ? 7 : range === "90" ? 90 : 30;
  const activeRange = String(days);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1-based page indices for the two tables (independent, range preserved).
  const usersPage = Math.max(1, Number(up) || 1);
  const eventsPage = Math.max(1, Number(ep) || 1);
  const usersOffset = (usersPage - 1) * PAGE_SIZE;
  const eventsOffset = (eventsPage - 1) * PAGE_SIZE;

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
    // Fetch through the current page plus one extra row so we can tell whether
    // a "Next" page exists without a separate count query.
    admin.rpc(
      "token_usage_top_users" as never,
      {
        p_since: since,
        p_limit: usersPage * PAGE_SIZE + 1,
      } as never,
    ),
    admin
      .from("token_usage" as never)
      .select(
        "id, created_at, provider, model, surface, source, input_tokens, output_tokens, total_tokens, images, billed, units, user_id",
      )
      .gte("created_at" as never, since as never)
      .order("created_at" as never, { ascending: false })
      .range(eventsOffset, eventsOffset + PAGE_SIZE),
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
  // Paginate: the queries fetched one extra row past the page to detect "Next".
  const topUsersAll = (topUserData as TopUserRow[] | null) ?? [];
  const usersHasNext = topUsersAll.length > usersPage * PAGE_SIZE;
  const topUsers = topUsersAll.slice(usersOffset, usersOffset + PAGE_SIZE);

  const recentAll = (recentData as RecentRow[] | null) ?? [];
  const eventsHasNext = recentAll.length > PAGE_SIZE;
  const recent = recentAll.slice(0, PAGE_SIZE);

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

  // Resolve emails for BOTH tables in one deduped pass (service role). The two
  // lists overlap heavily, and getUserById is one round-trip each — resolving
  // them separately would repeat most of the same lookups.
  const userEmails = new Map<string, string>();
  const idsToResolve = new Set<string>([
    ...topUsers.map((u) => u.user_id),
    ...recent.flatMap((r) => (r.user_id ? [r.user_id] : [])),
  ]);
  await Promise.all(
    [...idsToResolve].map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data.user?.email) userEmails.set(id, data.user.email);
    }),
  );

  /** Email if we resolved one, else a short id, else "—" for system work. */
  const userLabel = (id: string | null) =>
    id ? (userEmails.get(id) ?? `${id.slice(0, 8)}…`) : "—";

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
          <Pager
            page={usersPage}
            hasNext={usersHasNext}
            hrefFor={(pg) => tokensHref(activeRange, pg, eventsPage)}
          />
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
              <table className="w-full text-sm overflow-x-auto">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 px-3 font-medium">User</th>
                    <th className="py-2 px-3 font-medium">Surface</th>
                    <th className="py-2 px-3 font-medium">Model</th>
                    <th className="py-2 px-3 font-medium text-right">Tokens</th>
                    <th className="py-2 px-3 font-medium text-right">
                      Credits
                    </th>
                    <th
                      className="py-2 pl-3 font-medium text-right"
                      title="Estimated provider cost for this call, from MODEL_PRICING in lib/usage-pricing.ts"
                    >
                      Est. cost
                    </th>
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
                      <td className="py-2 px-3 text-muted-foreground break-all text-nowrap">
                        {userLabel(r.user_id)}
                      </td>
                      <td className="py-2 px-3 text-foreground break-all text-nowrap">
                        {r.surface}
                        {!r.billed && (
                          <span className="ml-1 text-[10px] uppercase text-muted-foreground">
                            ·{r.source}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground break-all text-nowrap">
                        {r.model}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground tabular-nums text-nowrap">
                        {r.images > 0
                          ? `${fmt(Number(r.total_tokens))} +${r.images}🖼`
                          : fmt(Number(r.total_tokens))}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-nowrap">
                        {r.billed && r.units != null ? (
                          <span className="font-medium text-foreground">
                            −{fmt(Number(r.units))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="py-2 pl-3 text-right tabular-nums text-nowrap text-muted-foreground">
                        {fmtUsdPrecise(estimateCostUsd(r))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager
            page={eventsPage}
            hasNext={eventsHasNext}
            hrefFor={(pg) => tokensHref(activeRange, usersPage, pg)}
          />
        </div>
      </div>
    </div>
  );
}
