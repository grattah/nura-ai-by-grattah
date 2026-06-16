"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { getCloudinaryUrl } from "@/lib/cloudinary";

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;

/**
 * Recipe hero image. Generated recipes are created with `image_url = null` and
 * the image is produced asynchronously, so when there's no image yet we poll the
 * row and swap it in once it's ready — no page reload needed.
 */
export function RecipeHeroImage({
  recipeId,
  title,
  initialImageUrl,
}: {
  recipeId: string;
  title: string;
  initialImageUrl: string | null;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);

  useEffect(() => {
    if (imageUrl) return; // already have one

    const supabase = createClient();
    let attempts = 0;
    let cancelled = false;

    const timer = setInterval(async () => {
      attempts += 1;
      if (cancelled || attempts > MAX_ATTEMPTS) {
        clearInterval(timer);
        return;
      }
      const { data } = await supabase
        .from("recipes")
        .select("image_url")
        .eq("id", recipeId)
        .maybeSingle();
      if (!cancelled && data?.image_url) {
        setImageUrl(data.image_url);
        clearInterval(timer);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [recipeId, imageUrl]);

  const src = imageUrl
    ? getCloudinaryUrl(imageUrl, { width: 900, height: 506 })
    : undefined;

  return (
    <div className="mx-6 rounded-4xl overflow-hidden bg-muted mb-8 relative aspect-video">
      {src ? (
        <Image
          src={src}
          alt={title}
          fill
          sizes="calc(100vw - 32px)"
          className="object-cover"
          priority
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="w-6 h-6 rounded-full border-2 border-mint-green border-t-transparent animate-spin" />
            <span className="text-xs">Creating image…</span>
          </div>
        </div>
      )}
    </div>
  );
}
