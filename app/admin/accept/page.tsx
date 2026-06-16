"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function AcceptInvite() {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Establish the session from the invite link (PKCE code), then let the user
  // set a password.
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setInvalid(true);
          return;
        }
        setReady(true);
        return;
      }
      // Maybe the SSR client already detected the session from the URL.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) setReady(true);
      else setInvalid(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  if (invalid) {
    return (
      <div className="w-full max-w-sm bg-card rounded-3xl border border-border p-6 text-center space-y-2">
        <h1 className="text-lg font-semibold text-foreground">
          Invite link invalid
        </h1>
        <p className="text-sm text-muted-foreground">
          This invitation link is invalid or has expired. Ask an admin to
          re-invite you.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm bg-card rounded-3xl border border-border p-6 space-y-5"
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">
          Set your password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a password to finish setting up your admin account.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={!ready}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || !ready} className="w-full">
        {loading ? "Saving…" : ready ? "Save and continue" : "Verifying…"}
      </Button>
    </form>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <Suspense fallback={null}>
        <AcceptInvite />
      </Suspense>
    </div>
  );
}
