// lib/strip-markdown.ts
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1") // italic
    .replace(/_(.*?)_/g, "$1") // italic underscore
    .replace(/`(.*?)`/g, "$1") // inline code
    .replace(/~~(.*?)~~/g, "$1") // strikethrough
    .replace(/^\s*[-*+]\s+/gm, "") // list items
    .replace(/^\s*#+\s+/gm, "") // headers
    .trim();
}
