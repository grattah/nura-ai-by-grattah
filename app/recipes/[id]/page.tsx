import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Info, Heart } from "lucide-react";
import { FaInfoCircle } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FollowUpSection } from "@/components/follow-up-section";
import { PaywallGate } from "@/components/paywall/paywall-gate";
import { ShareButton } from "@/components/share-button";
import { createClient } from "@/lib/supabase/server";
import { getCloudinaryUrl } from "@/lib/cloudinary";
import { isBookmarked } from "@/actions/bookmark";
import { BookmarkButton } from "@/components/bookmark-button";
import BackButton from "@/components/back-button";
import { DetoxCard } from "@/components/recipe/DetoxCard";
import Comment from "@/components/recipe/Comment";
import iconIngredients from "@/public/ingredients.png";
import iconHTMI from "@/public/HTMI.png";
import iconWIW from "@/public/WIW.png";

interface CommentData {
  id: string;
  username: string;
  avatarUrl: string;
  content: string;
  timestamp: string;
  likes: number;
  hasLiked?: boolean;
}

const mockComment: CommentData = {
  id: "comment-1",
  username: "gut.healer",
  avatarUrl: "/assets/avatars/gut-healer.jpg",
  content:
    "This juice reduced my bloating in just 2 days! I feel so light and fresh. 🌿",
  timestamp: "2d ago",
  likes: 24,
  hasLiked: false,
};

// React cache deduplicates this fetch — generateMetadata and the page
// both call getRecipe(id) but Supabase is only queried once per request.
const getRecipe = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*, follow_up_questions")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) return {};

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/recipes/${recipe.id}`;

  return {
    title: recipe.title,
    description: recipe.short_description,
    openGraph: {
      title: recipe.title,
      description: recipe.short_description,
      images: [{ url: recipe.image_url! }],
      url,
      type: "article",
    },
    other: {
      "fb:app_id": process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,
    },
  };
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [recipe, supabase] = await Promise.all([getRecipe(id), createClient()]);

  if (!recipe) return notFound();

  const [
    bookmarked,
    {
      data: { user },
    },
  ] = await Promise.all([isBookmarked(recipe.id), supabase.auth.getUser()]);

  const ingredients =
    (recipe.ingredients as Array<{ emoji: string; label: string }>) ?? [];

  const howToMake =
    (recipe.how_to_make as Array<{ step: string; instruction: string }>) ?? [];

  const heroImageUrl = recipe.image_url
    ? getCloudinaryUrl(recipe.image_url, { width: 900, height: 506 })
    : undefined;

  return (
    <PaywallGate>
      <div className="min-h-screen bg-background">
        {/* Sub-header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <BackButton className="p-3 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
          <div className="flex items-center gap-2">
            <ShareButton
              recipeId={recipe.id}
              recipeTitle={recipe.title}
              addText=""
              text=""
            />
            <BookmarkButton
              recipeId={recipe.id}
              initialBookmarked={bookmarked}
              isAuthenticated={!!user}
              text=""
              addText=""
            />
          </div>
        </div>

        <main className="pb-6">
          {/* Hero image — LCP element, load eagerly */}
          <div className="mx-4 rounded-3xl overflow-hidden bg-muted mb-8 relative aspect-video">
            {heroImageUrl && (
              <Image
                src={heroImageUrl}
                alt={recipe.title}
                fill
                // Full width minus mx-4 (16px each side)
                sizes="calc(100vw - 32px)"
                className="object-cover"
                priority
              />
            )}
          </div>

          {/* Title + description */}
          <div className="px-4 mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1.5 leading-tight">
              {recipe.title}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {recipe.short_description}
            </p>
          </div>

          <div className="px-4 mb-8">
            <DetoxCard detoxPercent={91} hydrationPercent={2} />
          </div>

          {/* Accordion sections */}
          <div className="px-4 space-y-3">
            <Accordion type="multiple" defaultValue={[]} className="space-y-3">
              {/* 1 — Ingredients */}
              <AccordionItem
                value="ingredients"
                className="border-0 rounded-lg overflow-hidden bg-[#FFFFFF]"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
                  <div className="flex items-center gap-2.5">
                    <Image src={iconIngredients} alt="ingredients icon" />
                    <span className="text-base font-medium text-black/80">
                      Ingredients
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <div className="space-y-2">
                    {ingredients.map((ing, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg px-4 min-h-12 bg-[#F2F6F5]"
                      >
                        <span className="text-lg leading-none">
                          {ing.emoji}
                        </span>
                        <span className="text-sm font-medium text-[#000000]">
                          {ing.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* 2 — How to make it */}
              <AccordionItem
                value="how-to"
                className="border-0 rounded-lg overflow-hidden bg-[#FFFFFF]"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
                  <div className="flex items-center gap-2.5">
                    <Image src={iconHTMI} alt="HTMI icon" />
                    <span className="text-base font-medium text-foreground">
                      How to make it
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-0">
                  <ol className="space-y-3 bg-[#F2F6F5] p-4 rounded-lg">
                    {howToMake.map((step, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-base leading-relaxed text-[#57605E]"
                      >
                        <span className="text-foreground shrink-0 min-w-5">
                          {step.step}.
                        </span>
                        <span>{step.instruction}</span>
                      </li>
                    ))}
                  </ol>
                </AccordionContent>
              </AccordionItem>

              {/* 3 — Why it works */}
              <AccordionItem
                value="why"
                className="border-0 rounded-lg overflow-hidden bg-[#FFFFFF]"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
                  <div className="flex items-center gap-2.5">
                    <Image src={iconWIW} alt="HTMI icon" />
                    <span className="text-base font-medium text-foreground">
                      Why it works
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-0">
                  <p className="text-base text-[#57605E] leading-relaxed bg-[#F2F6F5] p-4 rounded-lg">
                    {recipe.why_it_works}
                  </p>
                </AccordionContent>
              </AccordionItem>

              {/* 4 — Inside Tip */}
              <AccordionItem
                value="tip"
                className="border-0 rounded-lg overflow-hidden bg-[#EEF4FB]"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                      <FaInfoCircle fill="#1558EA" size={16} />
                    </div>
                    <span className="text-base font-medium text-[#1B1D1D]">
                      Inside Tip
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-0">
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {recipe.inside_tip}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Follow-up questions + RAG chat */}
            <div className="pt-2">
              <FollowUpSection
                contextId={recipe.id}
                contextType="recipe"
                title={recipe.title}
                description={recipe.short_description}
                savedQuestions={recipe.follow_up_questions}
              />
            </div>

            <div className="flex justify-between items-center mt-8">
              <div className="flex items-center gap-2">
                <p className="text-[#727E7A] text-xs">Was this helpful?</p>
                <button className="p-2 rounded-full bg-[#E8E6DC]">
                  <Heart size={16} color="#227B6F" strokeWidth={1.5} />
                </button>
              </div>
              <p className="font-medium text-xs">
                1.6k people found this helpful
              </p>
            </div>

            <div className="flex justify-between items-center mt-8">
              <ShareButton
                recipeId={recipe.id}
                recipeTitle={recipe.title}
                text="Send this to a friend"
                addText="show"
              />
              <BookmarkButton
                recipeId={recipe.id}
                initialBookmarked={bookmarked}
                isAuthenticated={!!user}
                text="Save this recipe"
                addText="show"
              />
            </div>

            <div className="mt-8">
              <Comment
                total={12}
                latestComment={mockComment}
                seeAllHref="/recipes/ashwagandha-moon-milk/comments"
              />
            </div>
          </div>
        </main>
      </div>
    </PaywallGate>
  );
}
