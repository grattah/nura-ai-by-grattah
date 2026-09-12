"use client";

import { useReportWebVitals } from "next/web-vitals";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface VitalEntry {
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

const RATING_COLOR: Record<string, string> = {
  good: "#16a34a",
  "needs-improvement": "#d97706",
  poor: "#dc2626",
};

const VITAL_ORDER = ["LCP", "INP", "CLS", "FCP", "TTFB"];

function fmt(name: string, value: number): string {
  return name === "CLS" ? value.toFixed(3) : `${Math.round(value)}ms`;
}

export function PerfProfiler() {
  const pathname = usePathname();
  const [vitals, setVitals] = useState<Record<string, VitalEntry>>({});
  const [navMs, setNavMs] = useState<number | null>(null);
  const [initialMs, setInitialMs] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const pendingNav = useRef<{ path: string; t: number } | null>(null);

  const reportVital = useCallback(
    (metric: { name: string; value: number; rating: string }) => {
      setVitals((prev) => ({
        ...prev,
        [metric.name]: {
          value: metric.value,
          rating: metric.rating as VitalEntry["rating"],
        },
      }));
      console.log(
        `[perf:web-vital] ${metric.name} ${fmt(metric.name, metric.value)} (${metric.rating})`,
      );
    },
    [],
  );
  useReportWebVitals(reportVital);

  useEffect(() => {
    const [nav] = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    if (nav) {
      const ms = nav.domContentLoadedEventEnd - nav.startTime;
      setInitialMs(ms);
      console.log(`[perf:load] initial DOMContentLoaded ${Math.round(ms)}ms`);
    }
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      pendingNav.current = { path: url.pathname, t: performance.now() };
    }
    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, []);

  useEffect(() => {
    const pending = pendingNav.current;
    if (!pending || pending.path !== pathname) return;
    pendingNav.current = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ms = performance.now() - pending.t;
        setNavMs(ms);
        console.log(`[perf:nav] → ${pathname} ${Math.round(ms)}ms`);
      });
    });
  }, [pathname]);

  const navColor =
    navMs == null
      ? "#9ca3af"
      : navMs < 500
        ? RATING_COLOR.good
        : navMs < 1500
          ? RATING_COLOR["needs-improvement"]
          : RATING_COLOR.poor;

  const baseStyle: React.CSSProperties = {
    position: "fixed",
    left: 8,
    bottom: 8,
    zIndex: 2147483647,
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: 11,
    lineHeight: 1.5,
    color: "#e5e7eb",
    background: "rgba(17,24,39,0.92)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
    backdropFilter: "blur(4px)",
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ ...baseStyle, padding: "4px 8px", cursor: "pointer" }}
        aria-label="Open performance profiler"
      >
        ⚡ {navMs != null ? `${Math.round(navMs)}ms` : "perf"}
      </button>
    );
  }

  return (
    <div style={{ ...baseStyle, padding: "8px 10px", width: 188 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        <span>⚡ perf</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            background: "transparent",
            border: "none",
            color: "#9ca3af",
            cursor: "pointer",
            fontSize: 13,
            lineHeight: 1,
            padding: 0,
          }}
          aria-label="Collapse performance profiler"
        >
          ×
        </button>
      </div>

      <div
        style={{
          color: "#9ca3af",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          marginBottom: 6,
        }}
        title={pathname}
      >
        {pathname}
      </div>

      <Row label="Initial" value={initialMs != null ? `${Math.round(initialMs)}ms` : "—"} />
      <Row label="Nav" value={navMs != null ? `${Math.round(navMs)}ms` : "—"} color={navColor} />

      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.1)",
          margin: "6px 0",
        }}
      />

      {VITAL_ORDER.map((name) => {
        const v = vitals[name];
        return (
          <Row
            key={name}
            label={name}
            value={v ? fmt(name, v.value) : "—"}
            color={v ? RATING_COLOR[v.rating] : "#9ca3af"}
          />
        );
      })}
    </div>
  );
}

function Row({
  label,
  value,
  color = "#e5e7eb",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span style={{ color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
