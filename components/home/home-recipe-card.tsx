"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type CardColor = "sage" | "slate";

interface HomeRecipeCardProps {
  id: string;
  title: string;
  imageUrl?: string;
  color?: CardColor;
  href?: string;
}

/**
 * Square recipe card used on the Home page "Wellness Recipes" horizontal scroll.
 * Uses semantic CSS variable tokens — no hardcoded colors.
 * The `sage` / `slate` colors are mapped to --nura-sage and --nura-slate
 * which are defined in globals.css and adapt correctly to light/dark mode.
 */
export function HomeRecipeCard({
  id,
  title,
  imageUrl,
  color = "sage",
  href = "#",
}: HomeRecipeCardProps) {
  return (
    <Link href={href} className="block">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl aspect-square",
          "hover:opacity-90 active:scale-[0.97] transition-all duration-150",
          color === "sage" ? "bg-nura-sage" : "bg-nura-slate",
        )}
      >
        {/* Image layer */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Gradient scrim for readability when image is present */}
        {imageUrl && (
          <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
        )}

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p
            className={cn(
              "text-sm font-semibold leading-snug",
              imageUrl ? "text-white" : "text-black/75",
            )}
          >
            {title}
          </p>
        </div>
      </div>
    </Link>
  );
}
