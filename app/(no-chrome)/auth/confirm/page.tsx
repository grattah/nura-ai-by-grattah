import { redirect } from "next/navigation";
import { LockKeyhole, MailCheck } from "lucide-react";
import { confirmOtp } from "@/actions/confirm-otp";

// Token-bearing URL — never let it into an index.
export const metadata = { robots: { index: false, follow: false } };

/**
 * Interstitial for emailed auth links. Renders the token back as a form and
 * does nothing until the user submits it; see actions/confirm-otp.ts for why
 * the verification can't happen on GET.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const token_hash = one(params.token_hash);
  const type = one(params.type);
  const next = one(params.next) ?? "/";

  if (!token_hash || !type) {
    redirect("/auth/error?error=Missing+token+hash+or+type");
  }

  const isRecovery = type === "recovery";
  const Icon = isRecovery ? LockKeyhole : MailCheck;

  return (
    <div className="flex w-full items-center justify-center px-6 md:px-10">
      <div className="w-full max-w-sm pt-16">
        <div className="text-center flex flex-col items-center space-y-2">
          <div className="p-3 rounded-full bg-mint-green w-min">
            <Icon color="#FFFFFF" size={24} />
          </div>
          <p className="text-xl text-base-text font-semibold">
            {isRecovery ? "Reset your password" : "Confirm your email"}
          </p>
          <p className="text-subtle text-sm">
            {isRecovery
              ? "Confirm it's you to choose a new password."
              : "Confirm it's you to finish verifying your email."}
          </p>
        </div>

        <form action={confirmOtp} className="mt-8">
          <input type="hidden" name="token_hash" value={token_hash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="w-full flex items-center justify-center bg-mint-green text-[#FFFFFF] py-4 rounded-full font-medium border border-border hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-subtle">
          This link can only be used once. If you didn&apos;t request it, you
          can close this page.
        </p>
      </div>
    </div>
  );
}
