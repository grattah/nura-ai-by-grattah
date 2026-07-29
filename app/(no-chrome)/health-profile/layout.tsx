import { createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";
import { getHealthProfile } from "@/actions/health-profile";
import { HealthProfileProvider } from "@/components/health-profile/health-profile-provider";
import { HealthProfilePaywallGate } from "@/components/health-profile/health-profile-paywall-gate";

export default async function HealthProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guests are NOT redirected. RouteAuthGuard (root layout) overlays the sign-in
  // modal on top of this page, so "Choose my goals" lands on the intro content
  // with the modal over it — from there the user signs in, or cancels back to
  // where they came from. Redirecting to /auth/login here pre-empted that.
  //
  // They also mustn't be treated as a lapsed subscriber: blocked=true would put
  // the "Get Nuko+" paywall under the sign-in modal, two overlays deep.
  const blocked = user
    ? !(await hasActiveSubscription(supabase, user.id))
    : false;
  const profile = user && !blocked ? await getHealthProfile() : null;

  return (
    <HealthProfileProvider initialProfile={profile}>
      <HealthProfilePaywallGate blocked={blocked}>
        {children}
      </HealthProfilePaywallGate>
    </HealthProfileProvider>
  );
}
