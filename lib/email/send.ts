import "server-only";
import { getResend } from "./resend";
import { EMAIL_FROM, SUPPORT_EMAIL } from "./config";

export { EMAIL_FROM, SUPPORT_EMAIL, APP_URL } from "./config";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo = SUPPORT_EMAIL,
}: SendEmailOptions): Promise<void> {
  const { error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    replyTo,
  });
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}
