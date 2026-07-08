import { getCachedUser, getCachedAccess } from "@/lib/supabase/server";
import { freeUseCount } from "@/lib/free-trial-server";
import { FREE_SURFACES, FREE_USES_PER_SURFACE } from "@/lib/credits";
import { PersonalizedSearchClient } from "./personalized-search-client";

// Decide "out of free searches" on the server so the route commits straight to
// the upgrade lock overlay — no client fetch / blank-page loader in between.
// (The home→search navigation runs inside a transition that holds the homepage
// loader until this render is ready.)
export default async function PersonalizedSearchPage() {
  const {
    data: { user },
  } = await getCachedUser();

  let serverBlocked = false;
  if (user) {
    const access = await getCachedAccess();
    if (access.isAuthenticated && !access.isSubscriber) {
      serverBlocked = access.hasEverSubscribed
        ? true // lapsed subscriber — locked
        : (await freeUseCount(user.id, FREE_SURFACES.personalizedSearch)) >=
          FREE_USES_PER_SURFACE;
    }
  }

  return <PersonalizedSearchClient serverBlocked={serverBlocked} />;
}
