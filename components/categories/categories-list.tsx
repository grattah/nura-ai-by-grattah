"use client";

import { CategoryCard } from "@/components/categories/category-card";
import { getCategoryConfig } from "@/lib/category-config";

interface Categories {
  display_order: number;
  id: string;
  name: string;
  slug: string;
}

const CategoriesList = ({ categories }: { categories: Categories[] }) => {
  // /categories is public; tiles just navigate. /categories/[slug] is protected
  // and gates guests via RouteAuthGuard.
  return (
    <div className="px-6 space-y-3">
      {categories.map((tag) => (
        <CategoryCard
          key={tag.id}
          slug={tag.slug}
          name={tag.name == "Beauty" ? "Anti-aging" : tag.name}
          config={getCategoryConfig(tag.slug)}
        />
      ))}
    </div>
  );
};

export default CategoriesList;
