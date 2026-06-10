export function truncateText(text: string, maxWords = 6): string {
  const words = text.trim().split(/\s+/);

  if (words.length <= maxWords) {
    return text;
  }

  return words.slice(0, maxWords).join(" ") + "...";
}
