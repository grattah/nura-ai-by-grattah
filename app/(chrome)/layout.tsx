import { getCachedUser } from "@/lib/supabase/server";
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
      }
    : null;

  return (
    <div className="min-h-dvh flex flex-col">
      <AuthSync serverAuthed={!!user} />
      <AppHeader user={headerUser} />
      <main className="flex-1 ">
        {children}
      </main>
      {/* <BottomNav /> */}
      <PWAInstallPrompt />
    </div>
  );
}

// pb-[calc(4.5rem+env(safe-area-inset-bottom))]
