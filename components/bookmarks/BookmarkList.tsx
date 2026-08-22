// components/bookmarks-list.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bookmark, Clock } from "lucide-react";
import { FaBookmark, FaHeart } from "react-icons/fa";

import { createClient } from "@/lib/supabase/client";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { truncateText } from "@/lib/truncate-text";
import { formatRelativeTime } from "@/lib/format-time";
import {
  fetchBookmarksPage,
  BOOKMARKS_PAGE_SIZE,
  type BookmarkedRecipe,
} from "@/lib/bookmark-fetch";

const FETCH_TIMEOUT_MS = 15000;

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

export function BookmarksList({
  initialBookmarks,
}: {
  initialBookmarks: BookmarkedRecipe[];
}) {
  const supabase = useMemo(() => createClient(), []);
  // Resolved from the session on first paginate, then reused.
  const userIdRef = useRef<string | null>(null);

  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [atEnd, setAtEnd] = useState(
    initialBookmarks.length < BOOKMARKS_PAGE_SIZE,
  );

  const pageRef = useRef(0); // page 0 came from the server
  const hasMoreRef = useRef(initialBookmarks.length === BOOKMARKS_PAGE_SIZE);
  const fetchingRef = useRef(false);
  const loadMoreErrorRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !hasMoreRef.current || loadMoreErrorRef.current) {
      return;
    }
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
      userIdRef.current ??= await getCurrentUserId(supabase);
      if (!userIdRef.current) {
        hasMoreRef.current = false;
        setAtEnd(true);
        return;
      }

      const next = pageRef.current + 1;
      const rows = await fetchBookmarksPage(
        supabase,
        userIdRef.current,
        next,
        controller.signal,
      );

      if (rows.length > 0) {
        pageRef.current = next;
        setBookmarks((prev) => {
          const seen = new Set(prev.map((b) => b.bookmark_id));
          return [...prev, ...rows.filter((r) => !seen.has(r.bookmark_id))];
        });
      }

      hasMoreRef.current = rows.length === BOOKMARKS_PAGE_SIZE;
      if (!hasMoreRef.current) {
        setAtEnd(true);
        observerRef.current?.disconnect();
      }
    } catch (e) {
      if (timedOut || !isAbortError(e)) {
        console.error("Failed to load more bookmarks:", e);
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

  // Cancel any in-flight request and detach the observer on unmount.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      observerRef.current?.disconnect();
    };
  }, []);

  return (
    <>
      <div className="grid gap-4">
        {bookmarks.map((b) => (
          <BookmarkCard key={b.bookmark_id} bookmark={b} />
        ))}
      </div>

      {!atEnd && (
        <div ref={sentinelRef} className="py-6 flex justify-center">
          {isLoadingMore ? (
            <div
              className="flex gap-1.5"
              role="status"
              aria-label="Loading more bookmarks"
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
              className="text-sm font-semibold text-[#227B6F] underline underline-offset-4 hover:opacity-75 transition-opacity active:scale-95"
            >
              Couldn&apos;t load more, retry
            </button>
          ) : null}
        </div>
      )}

      {atEnd && bookmarks.length >= BOOKMARKS_PAGE_SIZE && (
        <p className="text-center text-sm text-muted-foreground pb-2">
          You&apos;ve reached the end.
        </p>
      )}
    </>
  );
}

function BookmarkCard({ bookmark }: { bookmark: BookmarkedRecipe }) {
  const href = `/recipes/${bookmark.recipe_id}`;

  return (
    <Link href={href}>
      <div className="border-b border-[#E2E4E4] pb-4 overflow-hidden">
        <div className="p-0">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl bg-muted shrink-0 overflow-hidden aspect-square">
              {bookmark.image_url ? (
                <Image
                  src={bookmark.image_url}
                  alt={bookmark.title}
                  className="w-full h-full object-cover"
                  width={80}
                  height={80}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Bookmark className="size-6 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex flex-col gap-1.5">
              <div className="flex flex-col gap-2">
                <p className="text-base font-medium text-foreground leading-snug max-2xs:text-sm">
                  {bookmark.title}
                </p>
                <p className="text-sm text-[#57605E] max-2xs:text-xs">
                  {truncateText(bookmark.description)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Clock size={16} color="#9CA5A3" />
                  <p className="text-[#57605E] text-sm font-medium max-2xs:text-xs">
                    {formatRelativeTime(bookmark.bookmarked_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <FaHeart size={16} color="#227B6F" />
                  <p className="text-[#227B6F] text-sm font-medium max-2xs:text-xs">
                    {bookmark.likes}
                  </p>
                </div>
              </div>
            </div>

            <div className="size-10 flex items-center justify-center rounded-full bg-[#E3E8DF] shrink-0 ml-auto">
              <FaBookmark color="#227B6F" size={20} className="w-3 h-5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}