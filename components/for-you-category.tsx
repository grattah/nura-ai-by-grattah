"use client";

import React from "react";
import Link from "next/link";
import { FaLock } from "react-icons/fa";

import { createClient } from "@/lib/supabase/client";
import { getTopMatches } from "@/actions/for-you";
import { RecipeCardForYou } from "@/components/RecipeCardForYou";

export const ForYouCategory = () => {
  const [userId, setUserId] = React.useState<string | null>(null);
  const [hasProfile, setHasProfile] = React.useState(false);
  const [topRecipes, setTopRecipes] = React.useState<any[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setReady(true);
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from("health_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error(error.message);
        setReady(true);
        return;
      }

      const profileExists = !!data;
      setHasProfile(profileExists);

      if (profileExists) {
        const { recipes } = await getTopMatches(2);
        setTopRecipes(recipes);
      }
      setReady(true);
    };
    run();
  }, []);

  if (!ready) {
    return (
      <div className="mt-4 flex flex-col gap-2" aria-hidden>
        <div className="flex justify-between">
          <div className="h-5 w-20 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="min-w-0 space-y-3">
              <div className="aspect-square w-full rounded-2xl bg-muted animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!userId) return null;

  return (
    <div className="mt-4 flex flex-col gap-2 relative z-10">
      <div className="flex justify-between">
        <p className="text-title text-grey-c950 font-semibold leading-[100%]">
          For you
        </p>
        {ready && hasProfile && (
          <Link
            href="/for-you"
            className="text-sm font-semibold text-mint-green hover:opacity-75 transition-opacity py-1 px-3 rounded-full bg-[#F3F1E8]"
          >
            See all
          </Link>
        )}
      </div>
      {hasProfile ? (
        <div className="grid grid-cols-2 gap-4">
          {topRecipes.map((recipe, i) => {
            return (
              <div key={recipe.id} className="min-w-0">
                <RecipeCardForYou
                  key={recipe.id}
                  recipe={recipe}
                  score={recipe.matchScore}
                  priority={i < 2}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full max-w-95.5 h-55 flex flex-col gap-3 justify-center items-center rounded-3xl overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('/bg.png')" }}>
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
