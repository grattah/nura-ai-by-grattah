import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "standardwebhooks";
import { sendEmail } from "@/lib/email/send";
import {
  otpEmail,
  recoveryEmail,
  genericAuthEmail,
  type EmailContent,
} from "@/lib/email/templates";

export const maxDuration = 15;

// Supabase "Send Email" auth hook payload (Standard Webhooks signed).
interface SendEmailPayload {
  user: { email: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

function buildEmail(data: SendEmailPayload["email_data"]): EmailContent {
  const { token, token_hash, redirect_to, email_action_type } = data;

  // Use the app's own domain, not the payload's site_url (which resolves to
  // the API/Supabase domain and has no /auth/confirm route).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nukohealth.app";

  const confirmUrl = (type: string) => {
    const u = new URL("/auth/confirm", appUrl);
    u.searchParams.set("token_hash", token_hash);
    u.searchParams.set("type", type);
    if (redirect_to) u.searchParams.set("next", redirect_to);
    return u.toString();
  };

  switch (email_action_type) {
    case "magiclink":
    case "signup":
    case "email":
    case "reauthentication":
      return otpEmail({ code: token });
    case "recovery":
      return recoveryEmail({ url: confirmUrl("recovery") });
    default:
      return genericAuthEmail({ url: confirmUrl(email_action_type) });
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secret) {
    console.error("[send-email] SEND_EMAIL_HOOK_SECRET not configured");
    return new NextResponse("Not configured", { status: 500 });
  }

  // Verify the Standard Webhooks signature. Supabase stores the secret as
  // "v1,whsec_<base64>"; standardwebhooks wants the base64 portion.
  const h = await headers();
  let payload: SendEmailPayload;
  try {
    const wh = new Webhook(secret.replace(/^v1,whsec_/, ""));
    payload = wh.verify(rawBody, {
      "webhook-id": h.get("webhook-id") ?? "",
      "webhook-timestamp": h.get("webhook-timestamp") ?? "",
      "webhook-signature": h.get("webhook-signature") ?? "",
    }) as SendEmailPayload;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid signature";
    console.error(`[send-email] signature verification failed: ${msg}`);
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const to = payload.user?.email;
  if (!to) {
    return new NextResponse("No recipient", { status: 400 });
  }

  try {
    const { subject, html } = buildEmail(payload.email_data);
    await sendEmail({ to, subject, html });
  } catch (err) {
    // Return 500 so Supabase surfaces the failure to the user (auth emails must
    // be reliable) and can retry.
    const msg = err instanceof Error ? err.message : "send failed";
    console.error(`[send-email] failed to send: ${msg}`);
    return new NextResponse("Send failed", { status: 500 });
  }

  return NextResponse.json({ success: true });
}
