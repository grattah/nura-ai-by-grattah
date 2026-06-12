import type { UIMessage } from "ai";

// Per-context (recipe/guide) follow-up chat persistence in localStorage so the
// conversation survives navigation. Cleared only on logout (see
// components/chat-cache-cleaner.tsx).

const PREFIX = "nura-chat:";

function key(contextId: string): string {
  return `${PREFIX}${contextId}`;
}

export function loadChat(contextId: string): UIMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(contextId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? (parsed as UIMessage[]) : null;
  } catch {
    return null;
  }
}

export function saveChat(contextId: string, messages: UIMessage[]): void {
  if (typeof window === "undefined") return;
  // Never overwrite a stored conversation with an empty one — clearing is the
  // job of logout, not an empty render.
  if (!messages.length) return;
  try {
    window.localStorage.setItem(key(contextId), JSON.stringify(messages));
  } catch {
    // Quota / serialization errors are non-critical.
  }
}

export function clearAllChats(): void {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
