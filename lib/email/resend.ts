import "server-only";
import { Resend } from "resend";

// Lazily constructed so importing this module (e.g. Next build-time page-data
// collection) doesn't require RESEND_API_KEY — the client is only created on the
// first actual send.
let client: Resend | null = null;

export function getResend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY!);
  return client;
}
