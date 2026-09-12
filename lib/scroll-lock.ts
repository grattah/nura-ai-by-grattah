export function lockAppScroll() {
  const el = document.querySelector<HTMLElement>(".app-content");
  const previous = el?.style.overflow ?? "";
  if (el) el.style.overflow = "hidden";
  return () => {
    if (el) el.style.overflow = previous;
  };
}
