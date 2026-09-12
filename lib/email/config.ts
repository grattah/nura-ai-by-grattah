// Client-safe (no server-only) so email templates can be unit-tested.
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.nuko.health";

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Nuko <onboarding@resend.dev>";

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "info@nuko.health";

export const EMAIL_LOGO_URL = `${APP_URL}/web-app-manifest-512x512.png`;

export const BRAND = {
  primary: "#227B6F",
  text: "#1B1D1D",
  muted: "#57605E",
  faint: "#9CA5A3",
  pageBg: "#F3F1E8",
  cardBg: "#FFFFFF",
  border: "#E2E4E4",
} as const;
