"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type CardColor = "sage" | "slate";

interface HomeRecipeCardProps {
  id: string;
  title: string;
  imageUrl?: string;
  color?: CardColor;
  href?: string;
  /**
   * Pass `priority` for cards that are visible on first paint (e.g. the first
   * 2–3 cards in the scroll). Omit it for the rest — they'll lazy-load.
   */
  priority?: boolean;
}

export function HomeRecipeCard({
  id,
  title,
  imageUrl,
  color = "sage",
  href = "#",
  priority = false,
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
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 260px"
            className="object-cover"
            priority={priority}
          />
        )}

        {imageUrl && (
          <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
        )}

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
