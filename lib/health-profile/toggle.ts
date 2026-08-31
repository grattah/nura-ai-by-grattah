/** Add `key` to the array if absent, remove it if present. */
export function toggle(arr: string[], key: string): string[] {
  return arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
}

/** The most health goals a user may hold at once. */
export const MAX_GOALS = 3;

/**
 * The most existing conditions a user may hold at once.
 *
 * Three, matching goals. The 24-goal revision briefly made conditions
 * uncapped ("Select all that apply"); reverting to the earlier set restores
 * the cap the picker copy has always described.
 */
export const MAX_CONDITIONS = 3;

/**
 * Toggle `key` while never exceeding `max` selections.
 *
 * Deselect always works. Selecting past the cap replaces the OLDEST selection
 * rather than being ignored, so a tap always visibly does something — silently
 * dropping the tap reads as a broken button.
 */
export function toggleCapped(
  current: string[],
  key: string,
  max: number,
): string[] {
  if (current.includes(key)) return current.filter((k) => k !== key);
  if (current.length < max) return [...current, key];
  return [...current.slice(current.length - max + 1), key];
}
