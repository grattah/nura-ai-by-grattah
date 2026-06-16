import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Zap, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBalance } from "@/lib/credits-server";
import { DAILY_GRANT } from "@/lib/credits";

interface CreditTransaction {
  id: number;
  delta: number;
  reason: string;
  label: string | null;
  created_at: string;
}

const REASON_TITLES: Record<string, string> = {
  grant: "Daily credits",
  purchase: "Credits purchased",
  refund: "Refund",
  spend: "Used credits",
};

const SPEND_LABELS: Record<string, string> = {
  search: "Personalized search",
  "personalized-search": "Personalized search",
  followup: "Follow-up question",
  "follow-up": "Follow-up question",
  generate: "New recipe",
};

function txnTitle(t: CreditTransaction): string {
  if (t.reason === "spend") {
    if (t.label && SPEND_LABELS[t.label]) return SPEND_LABELS[t.label];
    return t.label ?? "Used credits";
  }
  return REASON_TITLES[t.reason] ?? "Credits";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/account/credits");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  const hasAccess =
    !!sub && (!sub.expires_at || new Date(sub.expires_at) > new Date());

  // Subscribers get the idempotent daily grant applied on view; others just see
  // their (carried-over / purchased) balance without a new grant.
  let balance = 0;
  if (hasAccess) {
    balance = await getBalance(user.id);
  } else {
    const { data: row } = await supabase
      .from("credits" as never)
      .select("balance")
      .eq("user_id" as never, user.id as never)
      .maybeSingle();
    balance = (row as { balance: number } | null)?.balance ?? 0;
  }

  const { data: txnData } = await supabase
    .from("credit_transactions" as never)
    .select("id, delta, reason, label, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const transactions = (txnData ?? []) as unknown as CreditTransaction[];

  const used = transactions
    .filter((t) => t.reason === "spend")
    .reduce((sum, t) => sum + Math.abs(t.delta), 0);
  const actions = transactions.filter((t) => t.reason === "spend").length;
  const lastTopUp = transactions.find(
    (t) => t.reason === "purchase" || t.reason === "grant",
  );

  return (
    <div className="min-h-dvh bg-background pb-10">
      {/* Header */}
      <div className="flex items-center px-6 pt-5 pb-4 gap-3 mb-3.5">
        <Link
          href="/account"
          className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center shrink-0 hover:opacity-75 transition-opacity"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 text-foreground" />
        </Link>
        <h1 className="flex-1 text-center text-xl font-semibold text-base-text">
          Credits
        </h1>
        <div className="size-10 shrink-0" aria-hidden />
      </div>

      <div className="px-6 space-y-5">
        {/* Balance card */}
        <div className="rounded-2xl p-5 bg-linear-to-r from-mint-green to-mint-green-2 text-white">
          <div className="flex items-center gap-2 text-white/90">
            <Zap size={18} />
            <p className="text-sm font-medium">Current balance</p>
          </div>
          <p className="mt-2 text-4xl font-bold">{balance}</p>
          <p className="mt-1 text-sm text-white/90">
            {hasAccess
              ? `Refreshes by ${DAILY_GRANT} each day · credits never expire`
              : "Subscribe to receive daily credits · credits never expire"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Actions" value={actions} />
          <Stat label="Credits used" value={used} />
          <Stat
            label="Last top-up"
            value={lastTopUp ? formatDate(lastTopUp.created_at) : "—"}
            small
          />
        </div>

        {/* Buy more */}
        <Link
          href="/buy-credits"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-full text-white font-semibold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "var(--mint-green)" }}
        >
          <Plus size={18} />
          Add more credits
        </Link>

        {/* Usage history */}
        <div className="space-y-2">
          <p className="text-base font-semibold text-base-text px-1">
            Usage history
          </p>
          {transactions.length === 0 ? (
            <div className="bg-card border border-[#E3E1D880] rounded-2xl p-6 text-center">
              <p className="text-sm text-subtle">
                No activity yet. Your credit grants, purchases and usage will
                appear here.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-[#E3E1D880] rounded-2xl overflow-hidden">
              {transactions.map((t, i) => (
                <div key={t.id}>
                  {i > 0 && <div className="h-px bg-black/5 mx-4" />}
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-base-text truncate">
                        {txnTitle(t)}
                      </p>
                      <p className="text-xs text-subtle">
                        {formatDate(t.created_at)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold shrink-0 ${
                        t.delta >= 0 ? "text-mint-green" : "text-grey-c700"
                      }`}
                    >
                      {t.delta >= 0 ? `+${t.delta}` : t.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  small,
}: {
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="bg-card border border-[#E3E1D880] rounded-2xl p-3 text-center">
      <p
        className={`font-bold text-base-text ${small ? "text-sm" : "text-2xl"}`}
      >
        {value}
      </p>
      <p className="text-xs text-subtle mt-1">{label}</p>
    </div>
  );
}
