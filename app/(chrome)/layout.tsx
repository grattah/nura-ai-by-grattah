import { getCachedUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";

import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { AuthSync } from "@/components/auth/auth-sync";

export default async function ChromeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    data: { user },
  } = await getCachedUser();

  const avatarUrl = user?.user_metadata?.avatar_url ?? "";

  const headerUser = user
    ? {
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "You",
        email: user.email,
        avatar: avatarUrl,
        avatarLetter: (
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "N"
        )
          .charAt(0)
          .toUpperCase(),
          isSubscriber: false,
      }
    : null;

    if(user) {
      const supabase = await createClient();
        // Shared rule: honours the paid-for period after a cancellation, and
        // (unlike the old check) actually looks at expires_at — a stale
        // 'active' row used to read as a live subscriber forever. The old
        // .maybeSingle() also ERRORED on the >1 row a user can legitimately
        // have, silently reporting "not subscribed".
        if (headerUser) {
          headerUser.isSubscriber = await hasActiveSubscription(
            supabase,
            user.id,
          );
        }
    }

  return (
    <div className="min-h-dvh flex flex-col">
      <AuthSync serverAuthed={!!user} />
      <AppHeader user={headerUser} />
      <main className="flex-1 pb-16">
        {children}
      </main>
      <BottomNav />
      <PWAInstallPrompt />
    </div>
  );
}
