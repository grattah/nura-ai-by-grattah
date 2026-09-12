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

  const profile = user ? await getHealthProfile() : null;

  return (
    <HealthProfileProvider initialProfile={profile}>
      {children}
    </HealthProfileProvider>
  );
}
