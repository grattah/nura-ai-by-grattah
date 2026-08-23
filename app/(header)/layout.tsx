import { getCachedUser, createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";

import { AppHeader } from "@/components/layout/app-header";
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

  // Entitlement goes through the shared helper, never an inline status check.
  // The inline version this replaces had three separate failure modes:
  //   • it tested the status column for active only, locking out anyone who
  //     cancelled mid-period despite having paid through expires_at;
  //   • it ignored expires_at, so a stale 'active' row read as a subscriber;
  //   • .maybeSingle() ERRORS when a user legitimately has more than one row
  //     (re-payments), which reads as null and silently drops the header state.
  if (user && headerUser) {
    const supabase = await createClient();
    headerUser.isSubscriber = await hasActiveSubscription(supabase, user.id);
  }

  return (
	<div className="min-h-dvh flex flex-col">
	  <AuthSync serverAuthed={!!user} />
	  <AppHeader user={headerUser} />
	  <main className="flex-1 pb-[calc(env(safe-area-inset-bottom,0px)+56px)]">
		{children}
	  </main>
	  <PWAInstallPrompt />
	</div>
  );
}
