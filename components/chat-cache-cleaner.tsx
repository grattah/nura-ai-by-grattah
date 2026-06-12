"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearAllChats } from "@/lib/chat-cache";

// Clears every cached follow-up conversation when the user signs out, so the
// next person on the device doesn't see the previous user's chats. Mounted once
// at the app root.
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
