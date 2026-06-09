"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LogBackInPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to get email from a cookie/storage, or leave blank
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user.email) setEmail(session.user.email);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isPending) return;
    setIsPending(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsPending(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace("/");
  };

  return (
    <div className="min-h-dvh bg-background pb-10">
      {/* Header */}
      <div className="flex flex-col items-center px-4 pt-5 pb-8">
        <div className="w-full flex items-center mb-4">
          <button
            onClick={() => router.back()}
            className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
            aria-label="Back"
          >
            <ArrowLeft className="size-5 text-foreground" />
          </button>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Log back in</h1>
        <p className="text-sm text-muted-foreground mt-1">Enter your new details to log in</p>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Your email address</label>
          <div className="flex items-center gap-3 bg-card rounded-2xl px-4 h-13 border border-border">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-base text-foreground flex-1">{email}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Password</label>
          <div className="flex items-center gap-3 bg-card rounded-2xl px-4 h-13 border border-border">
            <span className="text-muted-foreground shrink-0">🔒</span>
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="flex-1 bg-transparent text-base text-foreground outline-none"
            />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="text-muted-foreground shrink-0">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium"
            style={{ color: "var(--mint-green)" }}
          >
            Forgot password?
          </Link>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={!password.trim() || isPending}
          className="w-full py-4 rounded-full text-white font-semibold text-base disabled:opacity-50 mt-2"
          style={{ backgroundColor: "var(--mint-green)" }}
        >
          {isPending ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
