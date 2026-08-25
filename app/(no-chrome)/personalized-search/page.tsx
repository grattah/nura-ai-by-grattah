import { headers } from "next/headers";
import { getCachedUser, getCachedAccess, createClient } from "@/lib/supabase/server";
import { freeUseCount } from "@/lib/free-trial-server";
import { PERSONALIZED_SEARCH_SURFACE, FREE_USES_PER_SURFACE } from "@/lib/credits";
import { runPersonalizedSearch } from "@/lib/personalized-search-server";
import { PersonalizedSearchClient } from "./personalized-search-client";

export const maxDuration = 30;

// Generate the search on the server (no caching, fresh every time) so the
// home→search transition holds the homepage loader through generation and
// commits straight to the result — never a loader over a blank route.
export default async function PersonalizedSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = ((await searchParams).q ?? "").trim();
  const {
    data: { user },
  } = await getCachedUser();

  // Guests: RouteAuthGuard overlays the sign-in modal; the client renders the
  // skeleton behind it.
  if (!user) {
    return <PersonalizedSearchClient query={query} serverBlocked={false} />;
  }

  // Out of free searches / lapsed → lock overlay (decided without generating).
  const access = await getCachedAccess();
  let serverBlocked = false;
  if (access.isAuthenticated && !access.isSubscriber) {
    serverBlocked = access.hasEverSubscribed
      ? true
      : (await freeUseCount(user.id, PERSONALIZED_SEARCH_SURFACE)) >=
        FREE_USES_PER_SURFACE;
  }

  if (serverBlocked || !query) {
    return (
      <PersonalizedSearchClient query={query} serverBlocked={serverBlocked} />
    );
  }

  // Skip the (metered) generation on link prefetch — only real navigations run it.
  const isPrefetch = (await headers()).get("next-router-prefetch") === "1";
  if (isPrefetch) {
    return <PersonalizedSearchClient query={query} serverBlocked={false} />;
  }

  const supabase = await createClient();
  const outcome = await runPersonalizedSearch(supabase, user.id, query);

  return (
    <PersonalizedSearchClient
      query={query}
      serverBlocked={outcome.status === "blocked"}
      result={outcome.status === "ok" ? outcome.result : undefined}
      outOfTokens={outcome.status === "out_of_tokens"}
      genError={outcome.status === "error"}
    />
  );
}
