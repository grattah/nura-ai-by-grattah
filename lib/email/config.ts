// Shared, client-safe email config (no server-only import) so templates can be
// unit-tested. Email-safe hex colors (clients don't support oklch).
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.nuko.health";

// Sender identity, e.g. "Nuko <hello@mail.nukohealth.app>". Falls back to
// Resend's shared onboarding sender for local/dev so nothing throws.
export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Nuko <onboarding@resend.dev>";

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "info@nuko.health";

// Email clients can't render local SVGs — use a hosted PNG.
export const EMAIL_LOGO_URL = `${APP_URL}/web-app-manifest-512x512.png`;

export const BRAND = {
  primary: "#227B6F", // mint-green (matches in-app usage)
  text: "#1B1D1D",
  muted: "#57605E",
  faint: "#9CA5A3",
  pageBg: "#F3F1E8",
  cardBg: "#FFFFFF",
  border: "#E2E4E4",
} as const;
