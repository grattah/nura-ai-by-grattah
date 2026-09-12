import type { UIMessage } from "ai";

const PREFIX = "nura-chat:";

const MAX_AGE_MS = 5 * 60 * 1000;

interface StoredChat {
  savedAt: number;
  messages: UIMessage[];
}

function key(contextId: string): string {
  return `${PREFIX}${contextId}`;
}

export function loadChat(contextId: string): UIMessage[] | null {
  if (typeof window === "undefined") return null;
  const k = key(contextId);
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredChat | unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as StoredChat).savedAt !== "number" ||
      !Array.isArray((parsed as StoredChat).messages)
    ) {
      window.localStorage.removeItem(k);
      return null;
    }

    const { savedAt, messages } = parsed as StoredChat;
    if (Date.now() - savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(k);
      return null;
    }

    return messages.length ? messages : null;
  } catch {
    return null;
  }
}

export function saveChat(contextId: string, messages: UIMessage[]): void {
  if (typeof window === "undefined") return;
  if (!messages.length) return;
  try {
    const payload: StoredChat = { savedAt: Date.now(), messages };
    window.localStorage.setItem(key(contextId), JSON.stringify(payload));
  } catch {
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
  }
}
