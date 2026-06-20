// components/community-feed.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import profile from "@/public/profile.png";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/format-time";
import {
  fetchActivitiesPage,
  ACTIVITIES_PAGE_SIZE,
  type ActivityItem,
} from "@/lib/activities";
import Link from "next/link";

const FETCH_TIMEOUT_MS = 15000;

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

export function CommunityFeed({
  initialActivities,
}: {
  initialActivities: ActivityItem[];
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
      const rows = await fetchActivitiesPage(supabase, next, controller.signal);

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
    <div className="flex flex-col gap-5">
      {activities.map((item) => (
        <Link
          key={item.id}
          href={`/recipes/${item.recipe?.id}`}
          className="block"
        >
          <div className="flex items-stretch gap-6 w-full">
            <div className="flex gap-4 flex-1">
              <Image
                src={item.profile?.avatar_url || profile}
                alt={item.profile?.username || "unknown user"}
                width={44}
                height={44}
                className="rounded-full object-cover size-11 shrink-0"
              />
              <div className="flex flex-col gap-2.5">
                <p className="text-subtle text-base">
                  <span className="font-semibold text-[#1B1D1D]">
                    {item.profile?.username || "unknown user"}
                  </span>{" "}
                  {item.action} {item.recipe?.title}
                </p>
                <p className="text-[#57605E] text-sm">
                  {formatRelativeTime(item.created_at) === "now" ? "Just" : ""}{" "}
                  {formatRelativeTime(item.created_at)}{" "}
                  {formatRelativeTime(item.created_at) === "now" ? "" : "ago"}
                </p>
              </div>
            </div>
            {item.recipe?.image_url && (
              <Image
                src={item.recipe.image_url}
                alt="photo"
                className="rounded-lg object-cover w-15.5 h-auto max-h-20 shrink-0"
                width={62}
                height={80}
                sizes="62px"
              />
            )}
          </div>
        </Link>
      ))}

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
