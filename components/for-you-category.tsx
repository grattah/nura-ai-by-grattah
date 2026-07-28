"use client";

import React from "react";
import Link from "next/link";
import { FaLock } from "react-icons/fa";

import { useAccess } from "@/components/providers/access-provider";
import { createClient } from "@/lib/supabase/client";

export const ForYouCategory = () => {
  const [userId, setUserId] = React.useState<string | null>(null);
  const [hasProfile, setHasProfile] = React.useState(false);

  React.useEffect(() => {
    const fetchUser = async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data, error } = await supabase
        .from("health_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error(error.message);
        return;
      }
      setHasProfile(!!data);
    };
    fetchUser();
  }, []);

  if (!userId) return;

  return (
    <div className="mt-4 flex flex-col gap-2 relative z-10">
      <div className="flex justify-between">
        <p className="text-title text-grey-c950 font-semibold leading-[100%]">
          For you
        </p>
        {hasProfile && (
          <Link
            href="/for-you"
            className="text-sm font-semibold text-mint-green hover:opacity-75 transition-opacity py-1 px-3 rounded-full bg-[#F3F1E8]"
          >
            See all
          </Link>
        )}
      </div>
      {hasProfile ? (
        <div></div>
      ) : (
        <div className="w-full max-w-95.5 h-55 flex flex-col gap-3 justify-center items-center bg-white rounded-3xl">
          <div className="bg-[#F0F2EA] p-3 rounded-full">
            <FaLock color="#227B6F" size={16} />
          </div>
          <div className="flex flex-col gap-2 text-center items-center">
            <p className="font-semibold text-base text-black">
              Your personalized recipes are locked
            </p>
            <p className="font-semibold text-xs text-base-text w-8/12">
              Choose your health goals to get custom recipes that support them
            </p>
          </div>
          <Link
            href="/health-profile"
            className="bg-mint-green text-white py-3 px-4 rounded-full font-medium text-xs"
          >
            Choose my goals
          </Link>
        </div>
      )}
    </div>
  );
};
