import { createClient } from "@/lib/supabase/server";
import { getBalances } from "@/lib/tokens/server";
import { walletSnapshot } from "@/lib/tokens/spec";
import type { Plan } from "@/constants";
import { hasActiveSubscription } from "@/lib/subscription";
import TokensCard from "@/components/tokens/TokensCard";
import TokensModal from "@/components/tokens/TokensModal";
import BackButton from "@/components/back-button";
import { CoinAnimation } from "@/components/tokens/CoinAnimation";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import NoTokensYet from "@/components/tokens/NoTokensYet";

export default async function TokensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // guest → RouteAuthGuard sign-in overlay

  // Access + token state are independent — fetch them together.
  const [hasAccess, balances, { data: row }] = await Promise.all([
    hasActiveSubscription(supabase, user.id),
    getBalances(user.id),
    supabase
      .from("credits")
      .select("plan, next_allocation_at, last_purchase_at")
      .eq("user_id", user.id)
      .maybeSingle<{
        plan: string | null;
        next_allocation_at: string | null;
        last_purchase_at: string | null;
      }>(),
  ]);

  const wallet = walletSnapshot({
    balances,
    plan: (row?.plan as Plan | null) ?? null,
    nextAllocationAt: row?.next_allocation_at ?? null,
    lastPurchaseAt: row?.last_purchase_at ?? null,
  });

  // A lapsed subscriber still sees their purchased balance. Spec §7 freezes it
  // rather than deleting it precisely because it is money already paid —
  // hiding it would look identical to having destroyed it.
  const state = hasAccess || wallet.purchasedTokens > 0 ? wallet : null;

  return (
    <div className="min-h-dvh bg-background pb-10">
      <main className="px-6">
        <div className="flex items-center justify-between pt-5 pb-4 gap-3 mb-3.5">
          <BackButton
            backPage="/account"
            className="p-3 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity"
          />
          <div>
            <h1 className="flex-1 text-center text-xl font-semibold text-base-text capitalize">
              Tokens
            </h1>
            <p className="text-sm text-subtle">Manage your token</p>
          </div>
          <div className="size-10 shrink-0" aria-hidden />
        </div>

        {!state ? (
          <NoTokensYet />
        ) : (
          <div className="flex flex-col gap-8">
            {hasAccess && (
              <>
                <TokensCard variant="weekly" state={state} />
                <div className="w-full border border-[#E2E4E4]" />
              </>
            )}
            {state.purchasedTokens > 0 ? (
              <TokensCard variant="extra" state={state} />
            ) : (
              <TokensModal />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
