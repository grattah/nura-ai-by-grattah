"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccess } from "@/components/providers/access-provider";

export function AuthSync({ serverAuthed }: { serverAuthed: boolean }) {
  const { isAuthenticated, isLoading } = useAccess();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    // Client and server disagree in EITHER direction → re-run the server.
    if (isAuthenticated !== serverAuthed) {
      router.refresh();
    }
  }, [isAuthenticated, isLoading, serverAuthed, router]);

  return null;
}