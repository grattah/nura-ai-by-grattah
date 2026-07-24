"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface DailyPoint {
  day: string; // ISO date (YYYY-MM-DD)
  tokens: number;
  cost: number;
}

export interface SurfacePoint {
  surface: string;
  tokens: number;
  cost: number;
}

export interface ModelPoint {
  model: string;
  tokens: number;
  cost: number;
}

// A small categorical palette (mint-forward, colour-blind-friendly enough).
const BAR_COLORS = [
  "#34d399",
  "#60a5fa",
  "#f59e0b",
  "#f472b6",
  "#a78bfa",
  "#22d3ee",
  "#fb7185",
  "#4ade80",
];

const fmtTokens = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}k`
      : `${n}`;

const fmtDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-3xl p-4 sm:p-5">
      <h2 className="text-sm font-medium text-muted-foreground mb-3">{title}</h2>
      <div className="h-64 w-full">{children}</div>
    </div>
  );
}

function TooltipBox({
  label,
  rows,
}: {
  label: string;
  rows: { k: string; v: string }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground mb-1 break-all">{label}</p>
      {rows.map((r) => (
        <p key={r.k} className="text-muted-foreground">
          {r.k}: <span className="text-foreground">{r.v}</span>
        </p>
      ))}
    </div>
  );
}

export function TokenUsageCharts({
  daily,
  bySurface,
  byModel,
}: {
  daily: DailyPoint[];
  bySurface: SurfacePoint[];
  byModel: ModelPoint[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <ChartCard title="Tokens per day">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={daily}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="tokenFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="day"
                tickFormatter={fmtDay}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={fmtTokens}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as DailyPoint;
                  return (
                    <TooltipBox
                      label={fmtDay(p.day)}
                      rows={[
                        { k: "Tokens", v: p.tokens.toLocaleString() },
                        { k: "Est. cost", v: `$${p.cost.toFixed(2)}` },
                      ]}
                    />
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="tokens"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#tokenFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Tokens by surface">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={bySurface}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              stroke="var(--border)"
            />
            <XAxis
              type="number"
              tickFormatter={fmtTokens}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              type="category"
              dataKey="surface"
              width={140}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as SurfacePoint;
                return (
                  <TooltipBox
                    label={p.surface}
                    rows={[
                      { k: "Tokens", v: p.tokens.toLocaleString() },
                      { k: "Est. cost", v: `$${p.cost.toFixed(2)}` },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="tokens" radius={[0, 4, 4, 0]}>
              {bySurface.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Tokens by model">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={byModel}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              stroke="var(--border)"
            />
            <XAxis
              type="number"
              tickFormatter={fmtTokens}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              type="category"
              dataKey="model"
              width={140}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as ModelPoint;
                return (
                  <TooltipBox
                    label={p.model}
                    rows={[
                      { k: "Tokens", v: p.tokens.toLocaleString() },
                      { k: "Est. cost", v: `$${p.cost.toFixed(2)}` },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="tokens" radius={[0, 4, 4, 0]}>
              {byModel.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
