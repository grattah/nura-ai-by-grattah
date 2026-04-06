"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccess } from "@/hooks/use-access";
import { ArrowLeft, Mail, Key, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NuraLogo } from "../nura";

type RestoreStep =
  | "choice" // email or paste token
  | "email" // enter email to receive token
  | "email-sent" // confirmation that email was sent
  | "token" // paste token directly
  | "success"; // access restored

export function RestoreAccess() {
  const [step, setStep] = useState<RestoreStep>("choice");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { saveToken } = useAccess();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Support direct token restore from email link: /restore?token=abc123
  // Auto-populate the token field and jump straight to the paste step
  useState(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      setStep("token");
    }
  });

  // ── Request token email ──────────────────────────────────────────────────
  const handleRequestEmail = async () => {
    if (!email) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/access/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 404) {
        setError("No active subscription found for this email.");
        return;
      }

      if (res.status === 429) {
        setError("Too many attempts. Please wait a minute and try again.");
        return;
      }

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

      setStep("email-sent");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Validate and save token ──────────────────────────────────────────────
  const handleActivateToken = async () => {
    if (!token.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/access/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });

      const { valid } = await res.json();

      if (!valid) {
        setError(
          "This token is invalid or has expired. Please request a new one.",
        );
        return;
      }

      saveToken(token.trim());
      setStep("success");

      // Redirect home after a beat so user sees the success state
      setTimeout(() => router.replace("/"), 2000);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6">
        <Link
          href="/"
          className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="mb-8">
          <NuraLogo size="lg" variant="full" />
        </div>

        <div className="w-full max-w-sm space-y-4">
          {/* ── Choice step ── */}
          {step === "choice" && (
            <>
              <div className="text-center space-y-2 mb-6">
                <h1 className="text-2xl font-semibold text-foreground">
                  Restore access
                </h1>
                <p className="text-sm text-muted-foreground">
                  Get back into Nura on this device
                </p>
              </div>

              <button
                onClick={() => setStep("email")}
                className="w-full flex items-center gap-4 bg-card border border-border rounded-2xl p-4 hover:opacity-80 transition-opacity text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    Send me my access link
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    We'll email the link to the address you paid with
                  </p>
                </div>
              </button>

              <button
                onClick={() => setStep("token")}
                className="w-full flex items-center gap-4 bg-card border border-border rounded-2xl p-4 hover:opacity-80 transition-opacity text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    I have my access token
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Paste the token from your original access email
                  </p>
                </div>
              </button>

              <p className="text-center text-xs text-muted-foreground pt-2">
                Don't have an account yet?{" "}
                <Link href="/auth" className="text-foreground hover:underline">
                  Sign up →
                </Link>
              </p>
            </>
          )}

          {/* ── Email step ── */}
          {step === "email" && (
            <>
              <div className="text-center space-y-2 mb-6">
                <h1 className="text-2xl font-semibold text-foreground">
                  What's your email?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter the email address you used when you paid
                </p>
              </div>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRequestEmail()}
                autoComplete="email"
                autoFocus
                className="w-full px-4 py-4 rounded-2xl bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none"
              />

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <button
                onClick={handleRequestEmail}
                disabled={!email || isLoading}
                className="w-full flex items-center justify-center gap-2 bg-nura-cream text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send access link"
                )}
              </button>

              <button
                onClick={() => {
                  setStep("choice");
                  setError(null);
                }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </>
          )}

          {/* ── Email sent step ── */}
          {step === "email-sent" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">
                Check your inbox
              </h1>
              <p className="text-sm text-muted-foreground">
                We've sent your access link to{" "}
                <span className="text-foreground font-medium">{email}</span>.
                Click the link in the email to restore access on this device.
              </p>
              <p className="text-xs text-muted-foreground">
                Didn't get it? Check your spam folder, or{" "}
                <button
                  onClick={() => {
                    setStep("email");
                    setError(null);
                  }}
                  className="text-foreground hover:underline"
                >
                  try again
                </button>
                .
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setStep("token")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  I have my token, let me paste it →
                </button>
              </div>
            </div>
          )}

          {/* ── Token paste step ── */}
          {step === "token" && (
            <>
              <div className="text-center space-y-2 mb-6">
                <h1 className="text-2xl font-semibold text-foreground">
                  Paste your token
                </h1>
                <p className="text-sm text-muted-foreground">
                  Copy and paste the access token from your email
                </p>
              </div>

              <textarea
                placeholder="Paste your access token here…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoFocus
                rows={3}
                className={cn(
                  "w-full px-4 py-4 rounded-2xl bg-muted text-foreground placeholder:text-muted-foreground",
                  "border-0 focus:ring-2 focus:ring-ring outline-none resize-none text-sm font-mono",
                )}
              />

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <button
                onClick={handleActivateToken}
                disabled={!token.trim() || isLoading}
                className="w-full flex items-center justify-center gap-2 bg-nura-cream text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Activating…
                  </>
                ) : (
                  "Restore access"
                )}
              </button>

              <button
                onClick={() => {
                  setStep("choice");
                  setError(null);
                }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </>
          )}

          {/* ── Success step ── */}
          {step === "success" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">
                Access restored
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome back. Taking you home…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
