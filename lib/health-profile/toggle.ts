export function toggle(arr: string[], key: string): string[] {
  return arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
}

export const MAX_GOALS = 3;

export const MAX_CONDITIONS = 3;

/** Toggles a key, replacing the oldest selection when at the cap. */
export function toggleCapped(
  current: string[],
  key: string,
  max: number,
): string[] {
  if (current.includes(key)) return current.filter((k) => k !== key);
  if (current.length < max) return [...current, key];
  return [...current.slice(current.length - max + 1), key];
}
