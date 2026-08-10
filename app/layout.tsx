import type { Metadata, Viewport } from "next";
import { Red_Hat_Text, Lateef, Inter, Red_Hat_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { MobileGate } from "@/components/mobile-gate";
import { AccessProvider } from "@/components/providers/access-provider";
import { CreditsProvider } from "@/components/providers/credits-provider";
import { getCachedAccess } from "@/lib/supabase/server";
import { RouteAuthGuard } from "@/components/auth/route-auth-guard";
import { ChatCacheCleaner } from "@/components/chat-cache-cleaner";
import { PerfProfiler } from "@/components/dev/perf-profiler";
import { LiquidGlassFilter } from "@/components/liquid-glass-filter";

const _redHatText = Red_Hat_Text({
  subsets: ["latin"],
  variable: "--font-redHatText",
  display: "swap",
});

const _redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  variable: "--font-redHatDisplay",
  display: "swap",
});

const _lateef = Lateef({
  subsets: ["latin"],
  variable: "--font-lateef",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const _inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nuko",
  description: "Health and Wellness Companion",
  generator: "Devs",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nuko",
  },
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon.ico",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/favicon.ico",
        type: "image/x-icon",
      },
    ],
    apple: "/apple-icon.png",
  },
  other: {
    "fb:app_id": process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,
  },
};

export const viewport: Viewport = {
  themeColor: "#f3f1e8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated, hasAccess, hasEverSubscribed, isSubscriber } =
    await getCachedAccess();

  return (
    // DARK MODE: to re-enable, restore className="dark" on <html> and revert
    // ThemeProvider to: defaultTheme="system" enableSystem disableTransitionOnChange
    <html
      lang="en"
      suppressHydrationWarning
      className={`${_redHatText.variable}`}
    >
      <head>
        <meta name="apple-mobile-web-app-title" content="Nuko" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/web-app-manifest-192x192.png" />
        {/* Capture Chrome's install signal before hydration so the PWA prompt
            never misses the (once-fired, early) beforeinstallprompt event. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){window.__nukoBip=null;addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__nukoBip=e;dispatchEvent(new Event('nuko:bip'));});addEventListener('appinstalled',function(){window.__nukoBip=null;dispatchEvent(new Event('nuko:installed'));});})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <MobileGate>
            <AccessProvider
              serverHasAccess={hasAccess}
              serverIsAuthenticated={isAuthenticated}
              serverHasEverSubscribed={hasEverSubscribed}
              serverIsSubscriber={isSubscriber}
            >
              <CreditsProvider>{children}</CreditsProvider>
              <RouteAuthGuard />
            </AccessProvider>
          </MobileGate>
        </ThemeProvider>
        <LiquidGlassFilter />
        <ChatCacheCleaner />
        <Analytics />
        <Toaster />
        {process.env.NODE_ENV === "development" && <PerfProfiler />}
      </body>
    </html>
  );
}
