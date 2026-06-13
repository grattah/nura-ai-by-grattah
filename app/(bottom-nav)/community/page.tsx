import React from "react";
import Image from "next/image";

import profile from "@/public/profile.png";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/format-time";

const page = async () => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activities")
    .select(
      `
    id,
    action,
    created_at,
    profiles (
      id,
      username,
      avatar_url
    ),
    recipes (
      id,
      title,
      image_url
    )
  `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load community");
  }

  return (
    <div className="bg-background">
      <main>
        <div className="px-8 py-4.75 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A]">
          <p className="text-2xl font-semibold text-[#111312]">Community</p>
        </div>

        <div className="flex flex-col gap-4 px-6">
          <p className="font-semibold text-base">Recent activity</p>

          <div className="flex flex-col gap-5">
            {data?.map((item) => (
              <div key={item.id} className="flex items-stretch gap-6 w-full">
                <div className="flex gap-4 flex-1">
                  <Image
                    src={item.profiles?.avatar_url || profile}
                    alt={item.profiles?.username || "unknown user"}
                    width={48}
                    height={48}
                    className="rounded-full object-cover w-12 h-12 shrink-0"
                  />
                  <div className="flex flex-col gap-2.5">
                    <p className="text-subtle">
                      <span className="font-semibold text-[#1B1D1D]">
                        {item.profiles?.username || "unknown user"}
                      </span>{" "}
                      {item.action} {item.recipes?.title}
                    </p>
                    <p className="text-[#57605E] text-sm">
                      {formatRelativeTime(item.created_at)} ago
                    </p>
                  </div>
                </div>
                {item.recipes?.image_url && (
                  <Image
                    src={item.recipes.image_url}
                    alt="photo"
                    className="rounded-lg object-cover w-15.5 h-auto max-h-20 shrink-0"
                    width={62}
                    height={80}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default page;
