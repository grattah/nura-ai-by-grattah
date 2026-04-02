"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Bookmark, Bell, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import ThemeToggleButton from "../theme-toggle-button";
import { NuraLeafIcon } from "../nura";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface AppHeaderUser {
  name: string;
  email?: string;
  avatarLetter: string;
}

interface AppHeaderProps {
  user: AppHeaderUser | null;
}

const DETAIL_PATHS = ["/categories/", "/guides/"];

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isHome = pathname === "/";

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
    <header
      className={cn(
        "sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/40 px-4",
        isHome ? "py-4" : "",
      )}
    >
      <div className="flex items-center justify-between h-14">
        {/* ── Left: greeting on home, wordmark on sub-pages ───────────────── */}
        <div>
          {isHome && user ? (
            <>
              <h1 className="text-xl font-semibold text-foreground leading-tight">
                <span className="italic font-normal text-muted-foreground">
                  Hi,{" "}
                </span>
                {user.name}
              </h1>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">
                {"Let's answer some questions today."}
              </p>
            </>
          ) : isHome && !user ? (
            <>
              <h1 className="text-xl font-semibold italic text-foreground">
                Explore Nura
              </h1>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">
                Health & Wellness Companion
              </p>
            </>
          ) : (
            <Link href="/" className="text-base font-bold text-foreground">
              Nura
            </Link>
          )}
        </div>

        {/* ── Right: theme toggle + auth action ───────────────────────────── */}
        <div className="flex items-center gap-2">
          <ThemeToggleButton />

          {user ? (
            <>
              {/* Trigger button — sits outside Sheet so it's always in the header */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="w-10 h-10 rounded-full bg-card text-foreground hover:opacity-80 transition-opacity"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Sheet — controlled externally so the trigger button stays in header DOM */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent
                  side="right"
                  // [&>button]:hidden suppresses shadcn's built-in X button
                  // because we render our own below to match AppSidebar's style
                  className="w-80 max-w-[85vw] border-0 p-0 flex flex-col bg-background [&>button]:hidden"
                >
                  {/* sr-only title required by shadcn for a11y */}
                  <SheetTitle className="sr-only">Navigation menu</SheetTitle>

                  {/* ── Sidebar header ────────────────────────────────────── */}
                  <div className="flex items-center justify-between p-6 pt-12">
                    <h2 className="text-xl font-semibold text-foreground">
                      Menu
                    </h2>
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

                  {/* ── Nav links ─────────────────────────────────────────── */}
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

                  {/* ── User profile + sign out ────────────────────────────── */}
                  <div className="p-6 border-t border-nura-forest-light">
                    <div className="flex items-center gap-3 mb-6">
                      <NuraLeafIcon size="sm" />
                      <span className="text-foreground font-medium">
                        {user.name}
                      </span>
                    </div>
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
            </>
          ) : (
            <Button
              asChild
              variant="secondary"
              className="rounded-full px-5 h-11 text-sm font-semibold border-0 shadow-none bg-card text-foreground hover:opacity-80 transition-opacity"
            >
              <Link href="/auth/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
