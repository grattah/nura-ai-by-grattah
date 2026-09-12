export const DELETION_GRACE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function deletionDeadline(scheduledAt: string | Date): Date {
  return new Date(new Date(scheduledAt).getTime() + DELETION_GRACE_DAYS * DAY_MS);
}

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

/** True if the user signed in after scheduling deletion. */
export function signedInSinceScheduling(
  scheduledAt: string | Date,
  lastSignInAt: string | Date | null | undefined,
): boolean {
  if (!lastSignInAt) return false;
  const signedIn = new Date(lastSignInAt).getTime();
  if (Number.isNaN(signedIn)) return false;
  return signedIn > new Date(scheduledAt).getTime();
}
