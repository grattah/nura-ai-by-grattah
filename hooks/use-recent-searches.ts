import { useEffect, useState } from "react";
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
} from "@/lib/recent-searches";

export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>([]);

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
