"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  User,
  Lock,
  CreditCard,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NuraLeafIcon } from "@/components/nura-logo";
import {
  updateDisplayName,
  updatePassword,
  getStripePortalUrl,
} from "@/actions/profile";

interface SubscriptionInfo {
  status: string;
  plan: string | null;
  expires_at: string | null;
}

interface ProfileFormProps {
  user: {
    name: string;
    email: string;
    hasPassword: boolean;
    avatarLetter: string;
  };
  subscription: SubscriptionInfo | null;
}

export function ProfileForm({ user, subscription }: ProfileFormProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="p-0 h-auto min-h-11 min-w-11 text-foreground hover:opacity-70 transition-opacity gap-1 font-normal"
        >
          <Link href="/">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-foreground">
          Profile & Settings
        </h1>
      </div>

      <main className="px-4 pb-24 space-y-4">
        {/* ── Avatar + identity ────────────────────────────────────────────── */}
        <Card className="border-0 rounded-3xl shadow-none bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
              style={{ backgroundColor: "#5C6B3A", color: "#D4C48A" }}
            >
              {user.avatarLetter}
            </div>
            <div>
              <p className="text-base font-bold text-foreground">
                {user.name || "Your name"}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Name ────────────────────────────────────────────────────────── */}
        <NameSection initialName={user.name} />

        {/* ── Password ────────────────────────────────────────────────────── */}
        <PasswordSection hasPassword={user.hasPassword} />

        {/* ── Subscription ────────────────────────────────────────────────── */}
        <SubscriptionSection subscription={subscription} />
      </main>
    </div>
  );
}

// ─── Name section ──────────────────────────────────────────────────────────

function NameSection({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!name.trim()) return;
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateDisplayName(name);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  };

  return (
    <SectionCard icon={<User className="w-4 h-4" />} title="Display name">
      <input
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
        }}
        placeholder="Your full name"
        className="w-full px-4 py-3.5 rounded-2xl bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none text-base"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        onClick={handleSave}
        disabled={isPending || !name.trim() || name.trim() === initialName}
        className="w-full rounded-full min-h-12 bg-foreground text-background hover:bg-foreground/85 border-0 shadow-none font-semibold"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <>
            <Check className="w-4 h-4" /> Saved
          </>
        ) : (
          "Save name"
        )}
      </Button>
    </SectionCard>
  );
}

// ─── Password section ──────────────────────────────────────────────────────

function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updatePassword(newPassword, confirmPassword);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(true);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  };

  return (
    <SectionCard
      icon={<Lock className="w-4 h-4" />}
      title={hasPassword ? "Change password" : "Set a password"}
      description={
        hasPassword
          ? "Update your password to keep your account secure."
          : "Add a password so you can sign in without a code."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
          className="w-full px-4 py-3.5 rounded-2xl bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none text-base"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          className="w-full px-4 py-3.5 rounded-2xl bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none text-base"
        />
        {newPassword.length > 0 && newPassword.length < 8 && (
          <p className="text-xs text-muted-foreground">
            Password must be at least 8 characters
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && (
          <p className="text-sm text-green-600 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Password updated successfully
          </p>
        )}
        <Button
          type="submit"
          disabled={isPending || !newPassword || !confirmPassword}
          className="w-full rounded-full min-h-12 bg-foreground text-background hover:bg-foreground/85 border-0 shadow-none font-semibold"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : hasPassword ? (
            "Update password"
          ) : (
            "Set password"
          )}
        </Button>
      </form>
    </SectionCard>
  );
}

// ─── Subscription section ──────────────────────────────────────────────────

function SubscriptionSection({
  subscription,
}: {
  subscription: SubscriptionInfo | null;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManage = async () => {
    setIsLoading(true);
    setError(null);

    const result = await getStripePortalUrl();

    if ("error" in result) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    window.location.href = result.url;
  };

  const isActive = subscription?.status === "active";
  const expiry = subscription?.expires_at
    ? new Date(subscription.expires_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <SectionCard icon={<CreditCard className="w-4 h-4" />} title="Subscription">
      {isActive ? (
        <>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-base font-semibold text-foreground capitalize">
                {subscription?.plan ?? "Annual"} plan
              </p>
              {expiry && (
                <p className="text-sm text-muted-foreground">Renews {expiry}</p>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Active
            </span>
          </div>

          <Separator className="bg-border" />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleManage}
            disabled={isLoading}
            variant="secondary"
            className="w-full rounded-full min-h-12 bg-muted hover:bg-muted/70 text-foreground border-0 shadow-none font-semibold"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Manage subscription
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            You don't have an active subscription.
          </p>
          <Button
            asChild
            className="w-full rounded-full min-h-12 bg-foreground text-background hover:bg-foreground/85 border-0 shadow-none font-semibold"
          >
            <Link href="/checkout">Get full access →</Link>
          </Button>
        </>
      )}
    </SectionCard>
  );
}

// ─── Shared card wrapper ──────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-0 rounded-3xl shadow-none bg-card">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground -mt-2">{description}</p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
