"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Whole seconds left until `deadline`, never negative. Pure so the timing rule
 * can be tested without mounting a component.
 */
export function secondsRemaining(deadline: number, now: number): number {
  const left = Math.ceil((deadline - now) / 1000);
  return left > 0 ? left : 0;
}

/**
 * Counts down a resend cooldown.
 *
 * Every reset link invalidates the one before it, so a user who taps "Resend"
 * while waiting ends up with several mails in which only the newest works —
 * and they will usually open the first one that arrives. Holding the button for
 * a minute after each send gives the mail time to land before another link can
 * supersede it.
 */
export function useResendCooldown(seconds = RESEND_COOLDOWN_SECONDS) {
  const [remaining, setRemaining] = useState(0);
  const deadlineRef = useRef(0);

  const start = useCallback(() => {
    deadlineRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    // Recomputed from a deadline rather than decremented, so a backgrounded tab
    // (where timers are throttled) resumes with the correct count.
    const id = setInterval(() => {
      setRemaining(secondsRemaining(deadlineRef.current, Date.now()));
    }, 500);
    return () => clearInterval(id);
  }, [remaining]);

  return { remaining, isCoolingDown: remaining > 0, start };
}
