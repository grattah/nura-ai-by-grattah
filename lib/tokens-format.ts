function diffParts(resetAt: string | null) {
  if (!resetAt) return null;
  const ms = new Date(resetAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export function formatResetCountdown(resetAt: string | null): string {
  const p = diffParts(resetAt);
  if (!p) return "—";
  return `${p.d}d ${p.h}h ${p.m}m ${p.s}s`;
}

export function formatResetShort(resetAt: string | null): string {
  const p = diffParts(resetAt);
  if (!p) return "—";
  return `${p.d}d ${p.h}h`;
}

export function formatResetLong(resetAt: string | null): string {
  if (!resetAt) return "—";
  const d = new Date(resetAt);
  const date = d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} | ${time}`;
}

export function formatResetDate(resetAt: string | null): string {
  if (!resetAt) return "—";
  return new Date(resetAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatBoughtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
