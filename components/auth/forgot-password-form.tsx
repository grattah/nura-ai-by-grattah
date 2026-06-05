"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, LockKeyhole, X, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

import { ConfirmEmailModal } from "@/components/auth/ConfirmEmailModal";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setShowConfirmModal(false);
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    router.back();
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowConfirmModal(true);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex w-full justify-end">
        <button className="p-2 rounded-full bg-[#E8E6DC] hover:bg-[#D8D6CC]" onClick={goBack}>
          <X size={24} />
        </button>
      </div>
      {success ? (
        <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="p-4 rounded-full bg-[#227B6F]/10 relative">
            <div className="p-3 rounded-full bg-[#227B6F]">
              <Check color="#FFFFFF" size={24} strokeWidth={3} />
            </div>
          </div>
    
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Check your email</h2>
            <p className="text-sm text-[#57605E]">
              Password reset instructions sent
            </p>
          </div>
        </div>
    
        <div className="rounded-xl bg-[#F5F3EC] p-4 flex items-start gap-3">
          <Mail size={20} className="text-[#227B6F] mt-0.5 shrink-0" />
          <div className="flex flex-col">
            <p className="text-xs text-[#57605E] uppercase tracking-wide font-medium">
              Sent to
            </p>
            <p className="font-medium text-[#1A1A1A] break-all">{email}</p>
          </div>
        </div>
    
        <div className="rounded-xl border border-[#E8E6DC] p-4">
          <p className="text-sm text-[#57605E] leading-relaxed">
            If you registered using this email, a password reset link will arrive
            within a few minutes. Check your spam folder if you do not see it.
          </p>
        </div>
    
        <div className="flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full bg-[#227B6F] text-white py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isLoading ? "Resending..." : "Resend email"}
          </button>
    
          <Link
            href="/auth/login"
            className="w-full text-center text-[#227B6F] py-2 font-medium hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
      ) : (
        <div>
          <div className="text-center flex flex-col items-center space-y-2">
            <div className="p-3 rounded-full bg-[#227B6F] w-min">
              <LockKeyhole color="#FFFFFF" size={24} />
            </div>
            <p className="text-xl">Forgot Your Password</p>
            <p className="text-muted-foreground text-sm">
              Recover your password in quick easy steps
            </p>
          </div>
          <div className="mt-6">
            <form onSubmit={handleContinue}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <label
                    htmlFor="email"
                    className="text-[#57605E] text-sm font-medium"
                  >
                    Enter your registered email
                  </label>
                  <div className="relative">
                    <Mail
                      size={20}
                      color={email ? "#57605E" : "#9CA5A3"}
                      className="absolute top-4.75 left-3"
                    />
                    <input
                      id="email"
                      type="email"
                      placeholder="name@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-4 rounded-lg bg-[#FFFFFF] text-foreground placeholder:text-muted-foreground border focus:ring-2 focus:ring-ring outline-none"
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center bg-[#227B6F] text-[#FFFFFF] py-4 rounded-full font-medium border border-border hover:opacity-90 transition-opacity disabled:opacity-40"
                  disabled={!email || isLoading}
                >
                  {isLoading ? "Sending..." : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmEmailModal
        email={email}
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirm}
        isLoading={isLoading}
      />
    </div>
  );
}
