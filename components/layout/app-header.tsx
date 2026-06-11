"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bell, X, Bookmark, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { NuraLeafIcon } from "../nura-logo";

interface AppHeaderUser {
  name: string;
  email?: string;
  avatarLetter: string;
}

interface AppHeaderProps {
  user: AppHeaderUser | null;
}

export function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setSidebarOpen(false);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background/20 backdrop-blur-lg px-4 py-3">
      <div className="flex items-center justify-between h-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1 py-2 px-2.5 bg-white/20 backdrop-blur-[1px] border border-white/20 hover:bg-white/30 rounded-full">
          <Image
            src="/logo-outlined-nobg-dark.svg"
            alt="Nuko Logo"
            width={20}
            height={20}
          />
          <span className="text-xl font-semibold text-brown tracking-tight">
            Nuko
          </span>
        </Link>

        {/* Right side */}
        {user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-card transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-foreground" strokeWidth={1.75} />
            </Link>

            {/* Avatar — navigates to /account */}
            <Link
              href="/account"
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-[#D4C48A] hover:opacity-80 transition-opacity"
              style={{ backgroundColor: "#5C6B3A" }}
              aria-label="Account"
            >
              {user.avatarLetter}
            </Link>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="text-base font-semibold text-mint-green hover:opacity-75 transition-opacity underline underline-offset-4 py-2 px-4 bg-white/20 backdrop-blur-[1px] border border-white/20 hover:bg-white/30 rounded-full"
          >
            Sign in
          </Link>
        )}
      </div>

      {/* Sidebar — kept intact for all nav/sign-out actions */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="right"
          className="w-80 max-w-[85vw] border-0 p-0 flex flex-col bg-background [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>

          <div className="flex items-center justify-between p-6 pt-12">
            <h2 className="text-xl font-semibold text-foreground">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="w-10 h-10 rounded-full bg-card text-foreground hover:opacity-80 transition-opacity border-0"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex-1 px-6 py-4">
            <div className="space-y-3">
              {[
                {
                  label: "My Bookmarks",
                  href: "/bookmarks",
                  icon: <Bookmark className="w-5 h-5" />,
                },
                {
                  label: "Notifications",
                  href: "/notifications",
                  icon: <Bell className="w-5 h-5" />,
                },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center justify-between p-4 bg-card rounded-xl text-foreground hover:opacity-80 transition-opacity min-h-14"
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-foreground/60" />
                </Link>
              ))}
            </div>
          </nav>

          <div className="p-6 border-t border-nura-forest-light space-y-4">
            <Link
              href="/profile"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 p-3 -mx-3 rounded-xl hover:bg-card transition-colors active:scale-[0.98]"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                style={{ backgroundColor: "#5C6B3A", color: "#D4C48A" }}
              >
                {user?.avatarLetter}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user?.name}
                </p>
                {user?.email && (
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </Link>

            <Button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center justify-center gap-2 bg-nura-cream text-nura-forest h-auto py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50 border-0 shadow-none"
            >
              <LogOut className="w-5 h-5" />
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
