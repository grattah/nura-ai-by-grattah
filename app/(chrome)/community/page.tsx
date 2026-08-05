import { createClient } from "@/lib/supabase/server";
import { fetchActivitiesPage, actorLabel } from "@/lib/activities";
import { CommunityFeed } from "@/components/community/CommunityFeed";

const page = async () => {
  const supabase = await createClient();

  // Personal feed — only the signed-in user's own activity. Guests get the
  // sign-in overlay (RouteAuthGuard) over an empty feed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initialActivities = user
    ? await fetchActivitiesPage(supabase, 0, user.id)
    : [];

  // The actor is the same on every row, so resolve the name once here instead of
  // joining profiles per row. `user_metadata.full_name` is what the profile form
  // writes; `profiles.username` only mirrors it and can drift.
  const actorName = actorLabel(
    user?.user_metadata?.full_name as string | undefined,
  );

  return (
    <div className="bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <main>
        <div className="px-8 py-5 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A]">
          <p className="text-2xl font-semibold text-[#111312]">Activities</p>
        </div>

        <div className="flex flex-col gap-4 px-6">
          <p className="font-semibold text-base">Recent activity</p>
          <CommunityFeed
            initialActivities={initialActivities}
            userId={user?.id ?? null}
            actorName={actorName}
          />
        </div>
      </main>
    </div>
  );
};

export default page;
