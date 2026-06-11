import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Red_Hat_Text,
  Josefin_Sans,
  Red_Hat_Display,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { MobileGate } from "@/components/mobile-gate";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _redHatText = Red_Hat_Text({ subsets: ["latin"] });
const _josefinSans = Josefin_Sans({ subsets: ["latin"] });
const _redHatDisplay = Red_Hat_Display({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nuko",
  description: "Health and Wellness Companion",
  generator: "v0.app",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nura",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Nura" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/web-app-manifest-192x192.png" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <MobileGate>{children}</MobileGate>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
