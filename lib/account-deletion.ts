// lib/account-deletion.ts — the grace-period arithmetic, kept pure so the rules
// are pinned by tests rather than living inside a cron handler.

/** Days between requesting deletion and the account being destroyed. */
export const DELETION_GRACE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** When the account becomes eligible for permanent deletion. */
export function deletionDeadline(scheduledAt: string | Date): Date {
  return new Date(new Date(scheduledAt).getTime() + DELETION_GRACE_DAYS * DAY_MS);
}

/** Whole days left before permanent deletion; never negative. */
export function daysUntilDeletion(
  scheduledAt: string | Date,
  now: Date = new Date(),
): number {
  const ms = deletionDeadline(scheduledAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}

export function isPastGracePeriod(
  scheduledAt: string | Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= deletionDeadline(scheduledAt).getTime();
}

/**
 * The cron's safety net. Signing in is supposed to cancel the request via
 * `cancelScheduledDeletion()`, but that depends on every sign-in path calling it.
 * `auth.users.last_sign_in_at` is maintained by GoTrue itself and can't be
 * missed, so a sign-in after the request was made independently proves the user
 * came back — and the cron reactivates instead of deleting. Without this, one
 * un-hooked sign-in path would silently destroy a recovered account.
 */
export function signedInSinceScheduling(
  scheduledAt: string | Date,
  lastSignInAt: string | Date | null | undefined,
): boolean {
  if (!lastSignInAt) return false;
  const signedIn = new Date(lastSignInAt).getTime();
  if (Number.isNaN(signedIn)) return false;
  return signedIn > new Date(scheduledAt).getTime();
}
