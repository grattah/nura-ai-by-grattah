"use client";

import Link from "next/link";
import Image from "next/image";
import { getCloudinaryUrl } from "@/lib/cloudinary";
import { getCategoryConfig } from "@/lib/category-config";

interface RecipeCardNewProps {
  id: string;
  title: string;
  catSlug?: string;
  imageUrl?: string;
  category?: string;
  href?: string;
  priority?: boolean;
  initialBookmarked?: boolean;
}

export function RecipeCardNew({
  title,
  catSlug,
  imageUrl,
  category,
  href = "#",
  priority = false,
}: RecipeCardNewProps) {
  const transformedUrl = imageUrl
    ? getCloudinaryUrl(imageUrl, { width: 600, height: 600 })
    : undefined;

  return (
    <Link href={href} className="block group">
      <div className="space-y-3">
        {/* Image + overlays */}
        <div className="relative w-full aspect-183/167 rounded-2xl overflow-hidden bg-grey-c500">
          {transformedUrl && (
            <Image
              src={transformedUrl}
              alt={title}
              fill
              sizes="(max-width: 430px) calc((100vw - 16px) / 2), 183px"
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
              priority={priority}
              unoptimized={!transformedUrl.includes("/upload/")}
            />
          )}
        </div>

        {/* Meta */}
        <div className="px-0.5">
          {category && (
            <div
              style={{
                backgroundColor: getCategoryConfig(catSlug!).bgColor,
                color: getCategoryConfig(catSlug!).textColor,
              }}
              className="w-fit mb-0.5 rounded-2xl py-1 px-2 flex items-center gap-1"
            >
              <span
                style={{
                  backgroundColor: getCategoryConfig(catSlug!).textColor,
                }}
                className="rounded-full size-1.25"
              />
              <span className="text-xs font-semibold uppercase tracking-wide">
                {category}
              </span>
            </div>
          )}
          <p className="text-sm font-medium text-subtle leading-snug line-clamp-1">
            {title}
          </p>
        </div>
      </div>
    </Link>
  );
}
