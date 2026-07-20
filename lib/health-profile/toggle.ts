/** Add `key` to the array if absent, remove it if present. */
export function toggle(arr: string[], key: string): string[] {
  return arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
}
