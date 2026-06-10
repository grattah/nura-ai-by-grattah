// hooks/use-recent-searches.ts
import { useEffect, useState } from "react";
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
} from "@/lib/recent-searches";

export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>([]);

  // Read from localStorage on mount. We use useEffect because
  // localStorage is only available on the client.
  useEffect(() => {
    setRecents(getRecentSearches());
  }, []);

  const add = (term: string) => {
    addRecentSearch(term);
    setRecents(getRecentSearches());
  };

  const clear = () => {
    clearRecentSearches();
    setRecents([]);
  };

  return { recents, add, clear };
}
