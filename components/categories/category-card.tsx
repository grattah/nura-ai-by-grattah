import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { CategoryConfig } from "@/lib/category-config";

interface CategoryCardProps {
  slug: string;
  name: string;
  config: CategoryConfig;
}

export function CategoryCard({ slug, name, config }: CategoryCardProps) {
  return (
    <Link
      href={`/categories/${slug}`}
      className="block active:scale-[0.98] transition-transform"
    >
      <div
        className="flex items-center justify-between rounded-2xl pl-3.5 min-h-20 overflow-hidden"
        style={{ backgroundColor: config.bgColor }}
      >
        {/* Left: icon & text */}
        <div className="flex-1 min-w-0 pr-3 flex items-center gap-3 my-8">
          <Image
            src={config.iconUrl}
            alt={name}
            width={48}
            height={48}
            className="object-contain size-12"
          />
          <div className="z-10 relative">
            <p className="text-base font-semibold text-foreground leading-snug">
              {name}
            </p>
            <p className="text-sm text-muted-foreground leading-snug mt-0.5 text-nowrap">
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* Right: image + chevron */}
        <div className="shrink-0 overflow-hidden relative">
          <Image
            src={config.imageUrl}
            alt={name}
            width={110}
            height={108.24}
            sizes="(max-width: 430px) 25.6vw, 110px"
            className="object-cover z-0"
          />

          <div className="size-10 bg-white/70 backdrop-blur-xs rounded-full grid place-items-center absolute right-5 top-1/2 -translate-y-1/2">
            <ChevronRight className="size-5 text-grey-c700" strokeWidth={2} />
          </div>
        </div>
      </div>
    </Link>
  );
}
