import { createClient } from "@/lib/supabase/server";
import { fetchActivitiesPage, actorLabel } from "@/lib/activities";
import { CommunityFeed } from "@/components/community/CommunityFeed";

const page = async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initialActivities = user
    ? await fetchActivitiesPage(supabase, 0, user.id)
    : [];

  const actorName = actorLabel(
    user?.user_metadata?.full_name as string | undefined,
  );

  return (
    <div className="bg-background pb-12">
      <main>
        <div className="px-8 py-5 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A]">
          <p className="text-2xl font-semibold text-[#111312]">Activities</p>
        </div>

        <div className="flex flex-col gap-4 px-6">
          <p className="font-semibold text-base">Recent activity</p>
          <CommunityFeed
            initialActivities={initialActivities}
            actorName={actorName}
          />
        </div>
      </main>
    </div>
  );
};

export default page;
