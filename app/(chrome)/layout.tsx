import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";

export default async function ChromeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const headerUser = user
    ? {
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "You",
        email: user.email,
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
      <AppHeader user={headerUser} />
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav />
      <PWAInstallPrompt />
    </div>
  );
}
