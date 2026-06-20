// app/community/page.tsx
import { createClient } from "@/lib/supabase/server";
import { fetchActivitiesPage } from "@/lib/activities";
import { CommunityFeed } from "@/components/community/CommunityFeed";

const page = async () => {
  const supabase = await createClient();

  const initialActivities = await fetchActivitiesPage(supabase, 0);

  return (
    <div className="bg-background">
      <main>
        <div className="px-8 py-5 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A]">
          <p className="text-2xl font-semibold text-[#111312]">Community</p>
        </div>

        <div className="flex flex-col gap-4 px-6">
          <p className="font-semibold text-base">Recent activity</p>
          <CommunityFeed initialActivities={initialActivities} />
        </div>
      </main>
    </div>
  );
};

export default page;
