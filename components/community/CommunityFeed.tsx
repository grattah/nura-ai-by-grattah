// components/community/CommunityFeed.tsx — the user's own activity feed.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import profile from "@/public/profile.png";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/format-time";
import {
  fetchActivitiesPage,
  activityPhrase,
  activityTarget,
  ACTIVITIES_PAGE_SIZE,
  type ActivityItem,
} from "@/lib/activities";
import Link from "next/link";

const FETCH_TIMEOUT_MS = 15000;

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

/** "5m" → "5m ago", but "now" → "Just now". */
function timeLabel(createdAt: string): string {
  const t = formatRelativeTime(createdAt);
  return t === "now" ? "Just now" : `${t} ago`;
}

export function CommunityFeed({
  initialActivities,
  userId,
  actorName,
}: {
  initialActivities: ActivityItem[];
  /** Null for guests — the feed is empty and never paginates. */
  userId: string | null;
  /** The user's name, or "You" when they haven't set one. */
  actorName: string;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [activities, setActivities] = useState(initialActivities);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [atEnd, setAtEnd] = useState(
    initialActivities.length < ACTIVITIES_PAGE_SIZE,
  );

  const pageRef = useRef(0); // page 0 came from the server
  const hasMoreRef = useRef(initialActivities.length === ACTIVITIES_PAGE_SIZE);
  const fetchingRef = useRef(false);
  const loadMoreErrorRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const loadMore = useCallback(async () => {
    if (
      !userId ||
      fetchingRef.current ||
      !hasMoreRef.current ||
      loadMoreErrorRef.current
    ) {
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
      const next = pageRef.current + 1;
      const rows = await fetchActivitiesPage(
        supabase,
        next,
        userId,
        controller.signal,
      );

      if (rows.length > 0) {
        pageRef.current = next;
        setActivities((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...rows.filter((r) => !seen.has(r.id))];
        });
      }

      hasMoreRef.current = rows.length === ACTIVITIES_PAGE_SIZE;
      if (!hasMoreRef.current) {
        setAtEnd(true);
        observerRef.current?.disconnect();
      }
    } catch (e) {
      if (timedOut || !isAbortError(e)) {
        console.error("Failed to load more activities:", e);
        loadMoreErrorRef.current = true;
        setLoadMoreError(true);
      }
    } finally {
      clearTimeout(timer);
      fetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [supabase, userId]);

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
    <div className="flex flex-col gap-5">
      {activities.map((item) => {
        const row = (
          <div className="flex items-stretch gap-6 w-full">
            <div className="flex gap-4 flex-1">
              <Image
                src={profile}
                alt=""
                width={44}
                height={44}
                className="rounded-full object-cover size-11 shrink-0"
              />
              <div className="flex flex-col gap-2.5">
                <p className="text-subtle text-base">
                  <span className="font-semibold text-[#1B1D1D]">
                    {actorName}
                  </span>{" "}
                  {activityPhrase(item.action, activityTarget(item))}
                </p>
                <p className="text-[#57605E] text-sm">
                  {timeLabel(item.created_at)}
                </p>
              </div>
            </div>
            {item.recipe?.image_url && (
              <Image
                src={item.recipe.image_url}
                alt=""
                className="rounded-lg object-cover w-15.5 h-auto max-h-20 shrink-0"
                width={62}
                height={80}
                sizes="62px"
              />
            )}
          </div>
        );

        // Searches (and rows whose recipe was deleted) have nowhere to go —
        // linking them produced /recipes/undefined.
        return item.recipe?.id ? (
          <Link key={item.id} href={`/recipes/${item.recipe.id}`} className="block">
            {row}
          </Link>
        ) : (
          <div key={item.id}>{row}</div>
        );
      })}

      {/* A personal feed starts empty, unlike the old community-wide one. */}
      {activities.length === 0 && (
        <p className="text-sm text-[#57605E] py-6">
          Nothing here yet. Recipes you search, view, like or save will show up
          here.
        </p>
      )}

      {!atEnd && (
        <div ref={sentinelRef} className="py-6 flex justify-center">
          {isLoadingMore ? (
            <div
              className="flex gap-1.5"
              role="status"
              aria-label="Loading more activity"
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
              className="text-sm font-semibold text-mint-green underline underline-offset-4 hover:opacity-75 transition-opacity active:scale-95"
            >
              Couldn&apos;t load more, retry
            </button>
          ) : null}
        </div>
      )}

      {atEnd && activities.length >= ACTIVITIES_PAGE_SIZE && (
        <p className="text-center text-sm text-muted-foreground pb-2">
          You&apos;ve reached the end.
        </p>
      )}
    </div>
  );
}
