// Branded HTML email builders. Pure functions (no server-only) so they can be
// unit-tested. Each returns { subject, html } with inline, email-safe styles.
import { APP_URL, EMAIL_LOGO_URL, SUPPORT_EMAIL, BRAND } from "./config";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface LayoutOpts {
  heading: string;
  /** Pre-escaped/trusted HTML for the body paragraphs. */
  body: string;
  cta?: { label: string; url: string };
  preview?: string;
}

function layout({ heading, body, cta, preview }: LayoutOpts): string {
  const button = cta
    ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto;">
         <tr><td style="border-radius:9999px;background:${BRAND.primary};">
           <a href="${esc(cta.url)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:9999px;">${esc(cta.label)}</a>
         </td></tr>
       </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preview)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.pageBg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${BRAND.cardBg};border:1px solid ${BRAND.border};border-radius:20px;overflow:hidden;">
        <tr><td style="padding:28px 32px 8px;text-align:center;">
          <img src="${EMAIL_LOGO_URL}" alt="Nuko" width="48" height="48" style="border-radius:12px;display:inline-block;" />
        </td></tr>
        <tr><td style="padding:8px 32px 32px;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:${BRAND.text};text-align:center;">${esc(heading)}</h1>
          <div style="font-size:15px;line-height:1.6;color:${BRAND.muted};text-align:center;">${body}</div>
          <div style="text-align:center;">${button}</div>
        </td></tr>
      </table>
      <p style="max-width:480px;margin:20px auto 0;font-size:12px;line-height:1.5;color:${BRAND.faint};text-align:center;">
        Nuko — your health & wellness companion.<br>
        Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.faint};">${SUPPORT_EMAIL}</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

export interface EmailContent {
  subject: string;
  html: string;
}

/** Format Stripe minor units (e.g. 799 -> "£7.99") in the charge's own currency. */
export function formatMoney(minor: number, currency = "gbp"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    currencyDisplay: "narrowSymbol",
  }).format(minor / 100);
}

// ─── Auth (Supabase Send Email hook) ─────────────────────────────────────────

export function otpEmail({ code }: { code: string }): EmailContent {
  return {
    subject: "Your Nuko verification code",
    html: layout({
      heading: "Verify your email",
      preview: "Your Nuko verification code",
      body: `<p style="margin:0 0 16px;">Enter this code to continue. It expires shortly.</p>
        <p style="margin:0;font-size:30px;font-weight:700;letter-spacing:6px;color:${BRAND.text};">${esc(code)}</p>
        <p style="margin:16px 0 0;font-size:13px;color:${BRAND.faint};">If you didn't request this, you can ignore this email.</p>`,
    }),
  };
}

export function recoveryEmail({ url }: { url: string }): EmailContent {
  return {
    subject: "Reset your Nuko password",
    html: layout({
      heading: "Reset your password",
      preview: "Reset your Nuko password",
      body: `<p style="margin:0;">Click the button below to choose a new password. This link expires shortly. If you didn't request it, ignore this email.</p>`,
      cta: { label: "Reset password", url },
    }),
  };
}

export function passwordChangedEmail(): EmailContent {
  return {
    subject: "Your Nuko password was changed",
    html: layout({
      heading: "Password changed",
      preview: "Your Nuko password was changed",
      body: `<p style="margin:0;">Your password was just changed. You can now log in with your new password.</p>
        <p style="margin:16px 0 0;font-size:13px;color:${BRAND.faint};">If you didn't make this change, please contact us immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.faint};">${SUPPORT_EMAIL}</a>.</p>`,
      cta: { label: "Open Nuko", url: APP_URL },
    }),
  };
}

export function genericAuthEmail({ url }: { url: string }): EmailContent {
  return {
    subject: "Confirm your request on Nuko",
    html: layout({
      heading: "Confirm your request",
      preview: "Confirm your request on Nuko",
      body: `<p style="margin:0;">Click the button below to continue. This link expires shortly.</p>`,
      cta: { label: "Continue", url },
    }),
  };
}

// ─── Transactional ───────────────────────────────────────────────────────────

export function welcomeEmail({ name }: { name?: string | null }): EmailContent {
  const hi = name?.trim() ? `Hi ${esc(name.trim().split(/\s+/)[0])}, ` : "";
  return {
    subject: "Welcome to Nuko 🌿",
    html: layout({
      heading: "Welcome to Nuko",
      preview: "Welcome to Nuko",
      body: `<p style="margin:0 0 12px;">${hi}we're glad you're here. Explore wellness recipes, personalized guidance, and more.</p>`,
      cta: { label: "Open Nuko", url: APP_URL },
    }),
  };
}

interface SubscriptionEmailArgs {
  planLabel: string;
  renewsAt?: string | null;
  amount?: string | null;
}

export function subscriptionConfirmationEmail({
  planLabel,
  renewsAt,
  amount,
}: SubscriptionEmailArgs): EmailContent {
  const paid = amount
    ? `<p style="margin:0 0 12px;">You were charged <strong>${esc(amount)}</strong>.</p>`
    : "";
  const renew = renewsAt
    ? `<p style="margin:12px 0 0;font-size:13px;color:${BRAND.faint};">Next billing date: ${esc(renewsAt)}</p>`
    : "";
  return {
    subject: "Your Nuko subscription is active ✨",
    html: layout({
      heading: "You're subscribed to Nuko+",
      preview: "Your Nuko subscription is active",
      body: `<p style="margin:0;">Thanks for subscribing — your <strong>${esc(planLabel)}</strong> is now active and you have full access.</p>${paid}${renew}`,
      cta: { label: "Start exploring", url: APP_URL },
    }),
  };
}

// Sent instead of subscriptionConfirmationEmail when the user already had a
// (now lapsed/cancelled) subscription row — i.e. they're subscribing again.
export function resubscriptionEmail({
  planLabel,
  renewsAt,
  amount,
}: SubscriptionEmailArgs): EmailContent {
  const paid = amount
    ? `<p style="margin:0 0 12px;">You were charged <strong>${esc(amount)}</strong>.</p>`
    : "";
  const renew = renewsAt
    ? `<p style="margin:12px 0 0;font-size:13px;color:${BRAND.faint};">Next billing date: ${esc(renewsAt)}</p>`
    : "";
  return {
    subject: "Welcome back to Nuko ✨",
    html: layout({
      heading: "You're resubscribed",
      preview: "Welcome back to Nuko",
      body: `<p style="margin:0;">Your <strong>${esc(planLabel)}</strong> is active again — welcome back!</p>${paid}${renew}`,
      cta: { label: "Start exploring", url: APP_URL },
    }),
  };
}

export function paymentFailedEmail({
  planLabel,
  reason,
}: {
  planLabel: string;
  reason?: string | null;
}): EmailContent {
  const why = reason
    ? `<p style="margin:12px 0 0;font-size:13px;color:${BRAND.faint};">Reason: ${esc(reason)}</p>`
    : "";
  return {
    subject: "We couldn't process your Nuko payment",
    html: layout({
      heading: "Payment failed",
      preview: "We couldn't process your Nuko payment",
      body: `<p style="margin:0;">We tried to renew your <strong>${esc(planLabel)}</strong> but the payment didn't go through.</p>${why}
        <p style="margin:12px 0 0;">Please update your payment details to keep your access.</p>`,
      cta: { label: "Update payment method", url: `${APP_URL}/manage-subscription` },
    }),
  };
}

export function renewalReceiptEmail({
  planLabel,
  amount,
  date,
  invoiceUrl,
}: {
  planLabel: string;
  amount: string;
  date: string;
  invoiceUrl?: string | null;
}): EmailContent {
  return {
    subject: "Your Nuko payment receipt",
    html: layout({
      heading: "Payment received",
      preview: "Your Nuko payment receipt",
      body: `<p style="margin:0;">We charged <strong>${esc(amount)}</strong> for your <strong>${esc(planLabel)}</strong> on ${esc(date)}.</p>`,
      cta: invoiceUrl
        ? { label: "View receipt", url: invoiceUrl }
        : { label: "Manage subscription", url: `${APP_URL}/manage-subscription` },
    }),
  };
}

export function tokenPurchaseReceiptEmail({
  credits,
  amount,
  bundleLabel,
}: {
  credits: number;
  amount: string;
  bundleLabel?: string | null;
}): EmailContent {
  const bundle = bundleLabel ? ` (${esc(bundleLabel)})` : "";
  return {
    subject: "Your Nuko token purchase receipt",
    html: layout({
      heading: "Tokens added",
      preview: "Your Nuko token purchase receipt",
      body: `<p style="margin:0;">You purchased <strong>${credits} tokens</strong>${bundle} for <strong>${esc(amount)}</strong>.</p>`,
      cta: { label: "Open Nuko", url: APP_URL },
    }),
  };
}

export function cancellationEmail({
  planLabel,
  accessUntil,
}: {
  planLabel: string;
  accessUntil?: string | null;
}): EmailContent {
  const until = accessUntil
    ? `<p style="margin:12px 0 0;">You'll keep full access until <strong>${esc(accessUntil)}</strong>.</p>`
    : "";
  return {
    subject: "Your Nuko subscription has been cancelled",
    html: layout({
      heading: "Subscription cancelled",
      preview: "Your Nuko subscription has been cancelled",
      body: `<p style="margin:0;">Your <strong>${esc(planLabel)}</strong> won't renew.</p>${until}
        <p style="margin:12px 0 0;">Changed your mind? You can resume anytime.</p>`,
      cta: { label: "Manage subscription", url: `${APP_URL}/manage-subscription` },
    }),
  };
}
