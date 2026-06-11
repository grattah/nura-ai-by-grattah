"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Bookmark } from "lucide-react";
import { getCloudinaryUrl } from "@/lib/cloudinary";
import { toggleBookmark } from "@/actions/bookmark";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { useAccess } from "@/hooks/use-access";
import { cn } from "@/lib/utils";

interface RecipeCardNewProps {
  id: string;
  title: string;
  imageUrl?: string;
  category?: string;
  href?: string;
  priority?: boolean;
  initialBookmarked?: boolean;
}

export function RecipeCardNew({
  id,
  title,
  imageUrl,
  category,
  href = "#",
  priority = false,
  initialBookmarked = false,
}: RecipeCardNewProps) {
  const router = useRouter();
  const { hasAccess, isAuthenticated, isLoading } = useAccess();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const transformedUrl = imageUrl
    ? getCloudinaryUrl(imageUrl, { width: 600, height: 600 })
    : undefined;

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    setBookmarked((prev) => !prev);
    startTransition(async () => {
      const result = await toggleBookmark(id);
      if (result.error) {
        setBookmarked((prev) => !prev);
      } else {
        setBookmarked(result.bookmarked);
      }
    });
  };

  const handleUnlockClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPaywallOpen(true);
  };

  return (
    <>
      <Link href={href} className="block group">
        <div className="space-y-3">
          {/* Image + overlays */}
          <div className="relative h-41.75 w-49.75 rounded-2xl overflow-hidden bg-grey-c500">
            {transformedUrl && (
              <Image
                src={transformedUrl}
                alt={title}
                fill
                sizes="(max-width: 640px) 167px, 200px"
                className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                priority={priority}
              />
            )}

            {/* Bookmark badge */}
            <button
              type="button"
              onClick={handleBookmarkClick}
              disabled={isPending}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark recipe"}
              className="absolute top-2.5 right-2.5 size-6 rounded-full bg-white flex items-center justify-center shadow-sm disabled:opacity-50"
            >
              <Bookmark
                className={cn(
                  "w-3.5 h-3.5 text-foreground transition-all",
                  bookmarked && "fill-foreground",
                )}
                strokeWidth={1.5}
              />
            </button>

            {!isLoading && !hasAccess && (
              <button
                type="button"
                onClick={handleUnlockClick}
                className="bg-black/60 px-3 py-2 flex items-center gap-1.5 absolute bottom-2.75 left-1.5 rounded-full"
              >
                <Lock className="w-3 h-3 text-white shrink-0" />
                <span className="text-white text-xs font-medium tracking-wide uppercase">
                  Unlock Full Recipe
                </span>
              </button>
            )}
          </div>

          {/* Meta */}
          <div className="px-0.5">
            {category && (
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                {category}
              </p>
            )}
            <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
              {title}
            </p>
          </div>
        </div>
      </Link>

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
}
