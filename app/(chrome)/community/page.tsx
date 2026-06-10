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
  `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load community");
  }

  return (
    <div className="bg-background">
      <main className="px-4 pt-2">
        <p className="text-xl font-semibold">Community</p>

        <div className="mt-12 flex flex-col gap-4">
          <p className="font-semibold">Recent activity</p>

          <div className="flex flex-col gap-5">
            {data?.map((item) => (
              <div key={item.id} className="flex gap-6">
                <div className="flex gap-4">
                  <Image
                    src={item.profiles?.avatar_url || profile}
                    alt={item.profiles?.username || "unknown user"}
                    className="rounded-full w-12 h-12"
                    width={12}
                    height={12}
                  />
                  <div className="flex flex-col gap-2.5">
                    <p className="text-[#57605E]">
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
                    className="rounded-md w-20"
                    width={10}
                    height={10}
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
