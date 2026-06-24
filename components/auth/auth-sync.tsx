"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccess } from "@/components/providers/access-provider";

export function AuthSync({ serverAuthed }: { serverAuthed: boolean }) {
  const { isAuthenticated, isLoading } = useAccess();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || isLoading) return;
    if (isAuthenticated && !serverAuthed) {
      done.current = true;
      router.refresh();
    }
  }, [isAuthenticated, isLoading, serverAuthed, router]);

  return null;
}
