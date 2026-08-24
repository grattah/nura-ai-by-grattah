/**
 * Locks the app's scrolling container (see .app-content in globals.css)
 * while a fixed-position overlay is open, and returns the unlock function.
 *
 * The document/body is never the scroll container (app/layout.tsx keeps it
 * fixed so Safari's chrome doesn't collapse), so locking body.style.overflow
 * no longer blocks background scrolling — this locks the real container.
 */
export function lockAppScroll() {
  const el = document.querySelector<HTMLElement>(".app-content");
  const previous = el?.style.overflow ?? "";
  if (el) el.style.overflow = "hidden";
  return () => {
    if (el) el.style.overflow = previous;
  };
}
