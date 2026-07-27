import Image from "next/image";
import { CategoryConfig } from "@/lib/category-config";

interface CategoryBannerProps {
  name: string;
  config: CategoryConfig;
}

export function CategoryBanner({ name, config }: CategoryBannerProps) {
  return (
    <div
      className="flex items-center justify-between pl-6 min-h-16 overflow-hidden"
      style={{ backgroundColor: config.bgColor }}
    >
      <div className="flex-1 min-w-0 pr-3 my-4 flex items-center gap-4">
        <Image
          src={config.iconUrl}
          alt={name}
          width={48}
          height={48}
          className="object-contain"
        />
        <p className="text-lg font-semibold text-base-text capitalize">
          {name == "beauty" ? "Anti-aging" : name}
        </p>
      </div>
      <div className="shrink-0 overflow-hidden">
        <Image
          src={config.imageUrl}
          alt={name}
          width={102}
          height={88}
          className="object-cover"
        />
      </div>
    </div>
  );
}
