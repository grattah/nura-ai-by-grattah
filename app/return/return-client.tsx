"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ReturnClient({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
      .then((r) => r.json())
      .then(({ success }) => {
        console.log("Account activation result:", success);
      })
      .finally(() => {
        router.replace("/");
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-muted-foreground text-sm">
        Activating your account...
      </p>
    </div>
  );
}
