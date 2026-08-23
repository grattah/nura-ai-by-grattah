import { BottomNav } from "@/components/layout/bottom-nav";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";

export default function BottomNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom,0px)+56px)]">{children}</main>
      <BottomNav />
      <PWAInstallPrompt />
    </div>
  );
}