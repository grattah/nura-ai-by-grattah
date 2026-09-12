import { vi, beforeAll, afterAll } from "vitest";

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());

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
