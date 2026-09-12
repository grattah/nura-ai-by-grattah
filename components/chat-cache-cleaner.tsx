"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearAllChats } from "@/lib/chat-cache";

/** Clears cached follow-up chats on sign-out. */
export function ChatCacheCleaner() {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") clearAllChats();
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
}
