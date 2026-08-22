import { createClient } from "@/lib/supabase/server";
import { getHealthProfile } from "@/actions/health-profile";
import { HealthProfileProvider } from "@/components/health-profile/health-profile-provider";

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
  // The health profile is free for every user, subscribed or not.
  const profile = user ? await getHealthProfile() : null;

  return (
    <HealthProfileProvider initialProfile={profile}>
      {children}
    </HealthProfileProvider>
  );
}
