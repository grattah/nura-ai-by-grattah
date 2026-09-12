"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const RESEND_COOLDOWN_SECONDS = 60;

export function secondsRemaining(deadline: number, now: number): number {
  const left = Math.ceil((deadline - now) / 1000);
  return left > 0 ? left : 0;
}

export function useResendCooldown(seconds = RESEND_COOLDOWN_SECONDS) {
  const [remaining, setRemaining] = useState(0);
  const deadlineRef = useRef(0);

  const start = useCallback(() => {
    deadlineRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining(secondsRemaining(deadlineRef.current, Date.now()));
    }, 500);
    return () => clearInterval(id);
  }, [remaining]);

  return { remaining, isCoolingDown: remaining > 0, start };
}
