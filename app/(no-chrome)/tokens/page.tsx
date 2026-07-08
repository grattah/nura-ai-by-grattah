import { createClient } from "@/lib/supabase/server";
import { getTokenState } from "@/lib/credits-server";
import { hasActiveSubscription } from "@/lib/subscription";
import TokensCard from "@/components/tokens/TokensCard";
import TokensModal from "@/components/tokens/TokensModal";
import BackButton from "@/components/back-button";

export default async function TokensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // guest → RouteAuthGuard sign-in overlay

  // Access + token state are independent — fetch them together.
  const [hasAccess, tokenState] = await Promise.all([
    hasActiveSubscription(supabase, user.id),
    getTokenState(user.id),
  ]);

  const state = hasAccess ? tokenState : null;

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
          <div className="rounded-2xl bg-white p-6 text-center text-subtle">
            Subscribe to receive free weekly tokens.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <TokensCard variant="weekly" state={state} />
            <div className="w-full border border-[#E2E4E4]" />
            {state.extraPurchased > 0 ? (
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
