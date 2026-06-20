import { vi, beforeAll, afterAll } from "vitest";

// Handlers log diagnostic lines (e.g. "[webhook] …") that are expected in the
// adversarial cases — silence them so test output stays readable. Assertion
// failures are reported by Vitest independently of console.
beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());

// Dummy env so modules that read process.env at import time (Stripe client,
// Supabase clients) don't throw. Tests mock the actual network clients.
process.env.STRIPE_SECRET_KEY ??= "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_dummy";
process.env.STRIPE_PRICE_ID ??= "price_dummy";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon_dummy";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service_dummy";
process.env.NEXT_PUBLIC_APP_URL ??= "https://app.test";
process.env.RESEND_API_KEY ??= "re_dummy";
process.env.EMAIL_FROM ??= "Nuko <test@app.test>";
process.env.SEND_EMAIL_HOOK_SECRET ??= "v1,whsec_dGVzdHNlY3JldA==";
