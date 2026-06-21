// components/popular-recipes-list.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { truncateText } from "@/lib/truncate-text";
import { BookmarkProvider } from "@/components/bookmark-provider";
import { BookmarkButton } from "@/components/bookmark-button";
import {
  fetchPopularRecipesPage,
  POPULAR_PAGE_SIZE,
} from "@/lib/popular-recipes";

const FETCH_TIMEOUT_MS = 15000;

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

export function PopularRecipesList({
  initialRecipes,
  bookmarkedIds,
  isAuthenticated,
}: {
  initialRecipes: any[];
  bookmarkedIds: string[];
  isAuthenticated: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const bookmarkedSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  const [recipes, setRecipes] = useState(initialRecipes);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [atEnd, setAtEnd] = useState(initialRecipes.length < POPULAR_PAGE_SIZE);

  const pageRef = useRef(0);
  const hasMoreRef = useRef(initialRecipes.length === POPULAR_PAGE_SIZE);
  const fetchingRef = useRef(false);
  const loadMoreErrorRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !hasMoreRef.current || loadMoreErrorRef.current)
      return;
    fetchingRef.current = true;
    setIsLoadingMore(true);

    const controller = new AbortController();
    controllerRef.current = controller;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    try {
      const next = pageRef.current + 1;
      const rows = await fetchPopularRecipesPage(
        supabase,
        next,
        controller.signal,
      );
      if (rows.length > 0) {
        pageRef.current = next;
        setRecipes((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...rows.filter((r) => !seen.has(r.id))];
        });
      }
      hasMoreRef.current = rows.length === POPULAR_PAGE_SIZE;
      if (!hasMoreRef.current) {
        setAtEnd(true);
        observerRef.current?.disconnect();
      }
    } catch (e) {
      if (timedOut || !isAbortError(e)) {
        console.error("Failed to load more popular recipes:", e);
        loadMoreErrorRef.current = true;
        setLoadMoreError(true);
      }
    } finally {
      clearTimeout(timer);
      fetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [supabase]);

  const retryLoadMore = useCallback(() => {
    loadMoreErrorRef.current = false;
    setLoadMoreError(false);
    loadMore();
  }, [loadMore]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) loadMore();
        },
        { rootMargin: "200px" },
      );
      observerRef.current.observe(node);
    },
    [loadMore],
  );

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      observerRef.current?.disconnect();
    };
  }, []);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 space-y-3">
        {recipes.map((recipe) => {
          const firstTag = recipe.recipe_tags?.[0]?.tags?.name ?? null;
          return (
            <div key={recipe.id} className="relative flex flex-col gap-2">
              <div className="absolute flex justify-between px-2 top-3 left-0 right-0 z-10">
                <button className="bg-black/75 flex items-center gap-1 rounded-full p-1.5 px-3 shrink-0">
                  <Heart
                    size={12}
                    color="#FFFFFF"
                    strokeWidth={2}
                    className="size-3"
                  />
                  <span className="text-xs text-[#FFFFFF] opacity-100">
                    {recipe.likes}
                  </span>
                </button>
                <BookmarkProvider
                  recipeId={recipe.id}
                  initialBookmarked={bookmarkedSet.has(recipe.id)}
                  isAuthenticated={isAuthenticated}
                >
                  <BookmarkButton text="" addText="" popularStyle="yes" />
                </BookmarkProvider>
              </div>
              {recipe.image_url && (
                <Link href={`/recipes/${recipe.id}`}>
                  <div className="overflow-hidden rounded-2xl">
                    <Image
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="w-[clamp(136px,42.6vw,183px)] h-[clamp(124px,38.8vw,167px)] object-cover transition-transform duration-300 hover:scale-110"
                      width={183}
                      height={167}
                      sizes="(max-width: 430px) 42.6vw, 183px"
                    />
                  </div>
                </Link>
              )}
              {firstTag && (
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="text-[#727E7A] text-xs font-medium font-josefin uppercase"
                >
                  {firstTag}
                </Link>
              )}
              <Link
                href={`/recipes/${recipe.id}`}
                className="text-[#111312] font-medium text-base font-josefin line-clamp-1"
              >
                {truncateText(recipe.title, 3)}
              </Link>
            </div>
          );
        })}
      </div>

      {!atEnd && (
        <div ref={sentinelRef} className="py-6 flex justify-center">
          {isLoadingMore ? (
            <div
              className="flex gap-1.5"
              role="status"
              aria-label="Loading more recipes"
            >
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="w-2 h-2 rounded-full bg-[#9CA5A3] animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          ) : loadMoreError ? (
            <button
              onClick={retryLoadMore}
              className="text-sm font-semibold text-[#227B6F] underline underline-offset-4"
            >
              Couldn&apos;t load more, retry
            </button>
          ) : null}
        </div>
      )}
    </>
  );
}
