import { getWebhookHealth, REQUIRED_EVENTS } from "@/lib/stripe/webhook-health";
import { requireAdmin } from "@/lib/admin/auth";
import { AlertTriangle, Check } from "lucide-react";

export const dynamic = "force-dynamic";

function ago(iso: string | null): string {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export default async function WebhooksPage() {
  const gate = await requireAdmin("viewer");
  if (!gate.ok) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Stripe webhooks</h1>
        <p className="mt-4 text-sm text-[#DC2323]">{gate.error}</p>
      </div>
    );
  }

  const health = await getWebhookHealth();
  const enabledSomewhere = new Set(
    REQUIRED_EVENTS.filter((t) =>
      health.endpoints.some((e) => !e.missing.includes(t)),
    ),
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Stripe webhooks</h1>
        <p className="mt-1 text-sm text-subtle">
          Every event the app handles, whether Stripe is configured to send it,
          and when one last arrived. An event that is enabled but never received
          usually means the endpoint URL is redirecting — Stripe does not follow
          redirects.
        </p>
      </div>

      {health.mode !== "live" && (
        <div className="mb-6 flex gap-2 rounded-lg bg-[#F391281A] p-3 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-[#F39128]" />
          <p>
            Showing <strong>{health.mode}</strong> mode. Live endpoints are
            configured separately and are not visible with this key — check them
            in the Stripe dashboard.
          </p>
        </div>
      )}

      {health.error && (
        <p className="mb-6 rounded-lg bg-[#FFDBD6] p-3 text-sm text-[#DC2323]">
          Could not read the endpoint config: {health.error}
        </p>
      )}

      {/* ── Events ──────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-[#E2E4E4]">
        <table className="w-full text-sm">
          <thead className="bg-[#F7F7F5] text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Enabled in Stripe</th>
              <th className="px-4 py-3 font-medium">Last received</th>
            </tr>
          </thead>
          <tbody>
            {REQUIRED_EVENTS.map((type) => {
              const enabled = enabledSomewhere.has(type);
              const seen = health.lastSeen[type];
              return (
                <tr key={type} className="border-t border-[#E2E4E4]">
                  <td className="px-4 py-3 font-mono text-xs">{type}</td>
                  <td className="px-4 py-3">
                    {enabled ? (
                      <span className="inline-flex items-center gap-1 text-mint-green">
                        <Check className="size-4" /> yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#DC2323]">
                        <AlertTriangle className="size-4" /> NOT ENABLED
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      seen ? "text-subtle" : "font-semibold text-[#DC2323]"
                    }`}
                  >
                    {ago(seen)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Endpoints ───────────────────────────────────────────────────── */}
      <h2 className="mb-3 mt-8 text-base font-semibold">Endpoints</h2>
      {health.endpoints.length === 0 ? (
        <p className="text-sm text-subtle">No endpoints found for this key.</p>
      ) : (
        <div className="space-y-3">
          {health.endpoints.map((e) => (
            <div key={e.id} className="rounded-xl border border-[#E2E4E4] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{e.url}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    e.status === "enabled"
                      ? "bg-[#227B6F1A] text-mint-green"
                      : "bg-[#FFDBD6] text-[#DC2323]"
                  }`}
                >
                  {e.status}
                </span>
              </div>
              {e.missing.length > 0 ? (
                <p className="mt-2 text-sm text-[#DC2323]">
                  Missing: {e.missing.join(", ")} — add these under Update
                  details in the Stripe dashboard.
                </p>
              ) : (
                <p className="mt-2 text-sm text-subtle">
                  Sends every event the app handles.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
