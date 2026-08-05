import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { TbBrandLinkedin } from "react-icons/tb";
import { FaInstagram, FaTiktok } from "react-icons/fa";
import { createClient } from "@/lib/supabase/server";

import NukoLogo from "@/components/vectors/NukoLogo";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";

const features = [
  {
    id: 1,
    title: "Personalized Goal Matching",
    description:
      "Set your health goals, and Nuko scores every recipe against them. See your Match % and Nutri-Score side by side, so you always know what’s working for you.",
    image: "/personalized-goal.webp",
  },

  {
    id: 2,
    title: "Explore 1,000+ Curated Recipes",
    description:
      "Browse our curated collection, plus over 1 million more recipes, or search by ingredient. Every recipe is scored against its bioactivities, so you can find exactly what fits your goals.",
    image: "/curated-recipes.webp",
  },
  {
    id: 3,
    title: "Browse by Health Category",
    description:
      "Explore recipes organized by category, from gut health to skin & hair to energy, so you can quickly find what fits your goals.",
    image: "/health-category.webp",
  },
  {
    id: 4,
    title: "Ingredient Safety Insights",
    description:
      "Nuko flags real interactions, like grapefruit and certain medications, right on the recipe, so you can make informed choices without guesswork. Nothing is hidden, you always see the full picture.",
    image: "/safety.webp",
  },
  {
    id: 5,
    title: "Deep Recipe Guidance",
    description:
      "Every recipe comes with full how-to steps, nutritional breakdowns, and the science behind why it works. Ask follow-up questions to swap in ingredient alternatives, and see what other people are saying in the comments.",
    image: "/recipe-guidance.webp",
  },
];

const page = async() => {
  const supabase = await createClient();

  const {data: {user}} = await supabase.auth.getUser();
  if(user) {
    redirect("/");
  }
  return (
    <main className="bg-background">
      <div className="px-6 pt-4">
        <div className="pt-2 pb-5 font-redHatDisplay relative">
          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex flex-col gap-4.5">
              <p className="text-mint-green font-black text-[40px] leading-[44px]">
                Meet Nuko,
              </p>
              <p className="font-extrabold text-[32px] text-base-text leading-[120%]">
                The #1 whole-food solution based on ingredient bioactivity
              </p>
            </div>
            <p className="text-base text-subtle font-medium leading-[22px] font-redHatDisplay">
              Every ingredient contains bioactive compounds. Nuko maps them to
              the everyday goals you actually care about, personalized to you.
            </p>
            <Link
              href="/auth/login"
              className="bg-mint-green text-white w-fit rounded-full py-3 px-10 font-semibold text-sm font-redHatText"
            >
              Sign up
            </Link>
            <p className="text-sm text-subtle font-redHatDisplay">
              Got an account?{" "}
              <Link
                href="/auth/login"
                className="text-mint-green font-extrabold"
              >
                Sign in
              </Link>
            </p>
          </div>
          <Image
            src="/search-sec-flower.svg"
            alt="flower"
            width={121}
            height={159}
            className="absolute -right-3.5 -top-12 z-0"
          />
        </div>

        <div className="w-full">
          <Image
            src="/Landing.webp"
            alt="app-image"
            className=""
            width={366}
            height={326}
            priority
          />
        </div>

        <div className="mt-16 px-2">
          <p className="font-redHatDisplay text-[32px] font-extrabold text-center">
            What does Nuko offer
          </p>

          <div className="mt-8">
            <FeatureShowcase features={features} />
          </div>
        </div>
      </div>
      <footer className="mt-12 bg-[#155151] text-white py-3 px-6 flex flex-col gap-8">
        <div className="flex items-center gap-2">
          <NukoLogo />
          <p className="text-xl font-semibold leading-[32px]">Nuko</p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="font-semibold text-sm leading-[120%]">Legal</p>
          <div className="flex flex-col gap-2">
            <p className="text-xs leading-[120%]">Privacy policy</p>
            <p className="text-xs leading-[120%]">Terms of service</p>
            <p className="text-xs leading-[120%]">
              Washington Health Data Privacy Policy
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="font-semibold text-sm leading-[120%]">Company</p>
          <p className="text-xs leading-[120%]">Contact</p>
        </div>

        <div className="border-t border-[#FFFFFF33] p-4 flex flex-col gap-4 items-center text-center">
          <p className="text-xs text-[#F0E8DD] leading-[120%]">
            © Copyright 2026, All rights reserved
          </p>
          <div className="flex items-center gap-2">
            <Link href="">
              <FaInstagram size={18} color="#FFFFFF" />
            </Link>
            <Link href="">
              <TbBrandLinkedin size={18} color="#FFFFFF" />
            </Link>
            <Link href="">
              <FaTiktok size={18} color="#FFFFFF" />
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default page;
