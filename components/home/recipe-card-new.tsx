"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { getCloudinaryUrl } from "@/lib/cloudinary";
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

            {!isLoading && !hasAccess && (
              <button
                type="button"
                onClick={handleUnlockClick}
                className="bg-black/60 px-3 py-2 flex items-center gap-1.5 absolute bottom-2.75 left-1.5 rounded-full"
              >
                <Lock className="size-3 text-white shrink-0" />
                <span className="text-white text-2xs font-medium tracking-wide uppercase">
                  Unlock Full Recipe
                </span>
              </button>
            )}
          </div>

          {/* Meta */}
          <div className="px-0.5">
            {category && (
              <p className="text-xs text-grey-c500 uppercase tracking-wide mb-0.5">
                {category}
              </p>
            )}
            <p className="text-sm font-medium text-grey-c600 leading-snug line-clamp-1">
              {title}
            </p>
          </div>
        </div>
      </Link>

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
}
