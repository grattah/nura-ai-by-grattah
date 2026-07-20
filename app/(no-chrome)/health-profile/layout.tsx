import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";
import { getHealthProfile } from "@/actions/health-profile";
import { HealthProfileProvider } from "@/components/health-profile/health-profile-provider";
import { HealthProfilePaywallGate } from "@/components/health-profile/health-profile-paywall-gate";

// Health Profile is subscriber-only. Guests sign in; authenticated
// non-subscribers see the page behind the "Get Nuko+" paywall (no hard redirect
// — that read as a glitch), matching the "Complete health profile" CTA.
export default async function HealthProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const blocked = !(await hasActiveSubscription(supabase, user.id));
  const profile = blocked ? null : await getHealthProfile();

  return (
    <HealthProfileProvider initialProfile={profile}>
      <HealthProfilePaywallGate blocked={blocked}>
        {children}
      </HealthProfilePaywallGate>
    </HealthProfileProvider>
  );
}
