"use client";

import { useEffect, useState, useCallback } from "react";

const TOKEN_KEY = "nura_access_token";

export type AccessState = "loading" | "granted" | "denied";

export function useAccess() {
  const [state, setState] = useState<AccessState>("loading");

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState("denied");
      return;
    }
    // Validate token + bridge it to an HttpOnly cookie for middleware
    fetch("/api/access/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then(({ valid }) => setState(valid ? "granted" : "denied"))
      .catch(() => setState("denied"));
  }, []);

  const saveToken = useCallback((token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    setState("granted");
    // Immediately bridge to cookie
    fetch("/api/access/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  }, []);

  const hasAccess = state === "granted";
  const isLoading = state === "loading";

  return { hasAccess, isLoading, saveToken };
}
