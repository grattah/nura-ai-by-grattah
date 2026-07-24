"use client";

import Link from "next/link";

import type { Tag } from "@/lib/types";
import { getCategoryConfig } from "@/lib/category-config";
import { CategoryCard } from "../categories/category-card";

interface CategorySectionProps {
  categories: Tag[];
}

export function CategorySection({ categories }: CategorySectionProps) {
  // Home is public — tiles just navigate; /categories/[slug] is protected and
  // gates guests via RouteAuthGuard.
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-title leading-none font-semibold text-grey-c950">
          Category
        </h2>
        {/* <Link
          href="/categories"
          className="flex items-center gap-1 text-base text-mint-green hover:opacity-75 transition-opacity underline underline-offset-4 font-semibold"
        >
          See all
        </Link> */}
      </div>
      <div className="grid grid-cols-1 gap-2 w-full">
        {categories.map((tag) => (
          <CategoryCard
            key={tag.id}
            slug={tag.slug}
            name={tag.name == "Beauty" ? "Anti-aging" : tag.name}
            config={getCategoryConfig(tag.slug)}
          />
        ))}
      </div>
    </div>
  );
}
