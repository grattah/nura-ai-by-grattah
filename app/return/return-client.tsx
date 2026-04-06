"use client";

import { useEffect } from "react";
import { useAccess } from "@/hooks/use-access";
import { useRouter } from "next/navigation";

export function ReturnClient({
  email,
  stripeSessionId,
}: {
  email: string;
  stripeSessionId: string;
}) {
  const { saveToken } = useAccess();
  const router = useRouter();

  useEffect(() => {
    // Fetch the token that the webhook inserted
    fetch("/api/access/token-for-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stripeSessionId }),
    })
      .then((r) => r.json())
      .then(({ token }) => {
        if (token) saveToken(token);
      })
      .finally(() => {
        router.replace("/");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Setting up your access…</p>
    </div>
  );
}
