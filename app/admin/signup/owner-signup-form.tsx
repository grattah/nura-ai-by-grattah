"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { bootstrapOwner } from "@/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OwnerSignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await bootstrapOwner({ email, password, secret });
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Account created — sign in to establish the session, then enter the panel.
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signInErr) {
      router.replace("/admin/login");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm bg-card rounded-3xl border border-border p-6 space-y-5"
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">
          Create the owner account
        </h1>
        <p className="text-sm text-muted-foreground">
          This is a one-time setup for the single owner.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="secret">Setup key</Label>
        <Input
          id="secret"
          type="password"
          required
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating…" : "Create owner account"}
      </Button>
    </form>
  );
}
