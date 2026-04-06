import { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const stripeCSP = [
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com", // unsafe-inline needed for Next.js chunks
  "connect-src 'self' https://api.stripe.com https://r.stripe.com",
  "img-src 'self' data: https://*.stripe.com",
  "style-src 'self' 'unsafe-inline'",
].join("; ");

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts", // your service worker source
  swDest: "public/sw.js", // where the compiled SW goes
  reloadOnOnline: false, // IMPORTANT: prevents forced page reload when coming back online — would wipe unsaved form data
  disable: process.env.NODE_ENV === "development", // avoid cache hell during dev
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "rrawqwnupvlfonteiyrt.supabase.co",
        port: "",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: stripeCSP,
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
