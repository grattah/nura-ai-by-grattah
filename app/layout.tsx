import type { Metadata, Viewport } from "next";
import {
  // Geist_Mono,
  Red_Hat_Text,
  // Josefin_Sans,
  Red_Hat_Display,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { MobileGate } from "@/components/mobile-gate";
import { AccessProvider } from "@/components/providers/access-provider";
import { CreditsProvider } from "@/components/providers/credits-provider";
import { ChatCacheCleaner } from "@/components/chat-cache-cleaner";
import { PerfProfiler } from "@/components/dev/perf-profiler";

// const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _redHatText = Red_Hat_Text({
  subsets: ["latin"],
  variable: "--font-redHatDisplay",
  display: "swap",
});
// const _josefinSans = Josefin_Sans({ subsets: ["latin"] });
const _redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  variable: "--font-redHatDisplay",
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
        url: "/icon-light.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark.svg",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.ico",
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
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // DARK MODE: to re-enable, restore className="dark" on <html> and revert
    // ThemeProvider to: defaultTheme="system" enableSystem disableTransitionOnChange
    <html
      lang="en"
      suppressHydrationWarning
      className={`${_redHatText.variable} ${_redHatDisplay.variable}`}
    >
      <head>
        <meta name="apple-mobile-web-app-title" content="Nuko" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/web-app-manifest-192x192.png" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <MobileGate>
            <AccessProvider>
              <CreditsProvider>{children}</CreditsProvider>
            </AccessProvider>
          </MobileGate>
        </ThemeProvider>
        <ChatCacheCleaner />
        <Analytics />
        {process.env.NODE_ENV === "development" && <PerfProfiler />}
      </body>
    </html>
  );
}
