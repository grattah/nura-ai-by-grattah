import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CategoryCard } from "@/components/categories/category-card";
import { getCategoryConfig } from "@/lib/category-config";
import { getCategories } from "@/actions/categories";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="min-h-dvh bg-background pb-8">
      {/* Header */}
      <div className="flex items-center px-6 pt-5 pb-4 gap-3">
        <Link
          href="/"
          className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center shrink-0 hover:opacity-75 transition-opacity"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 text-foreground" />
        </Link>
        <h1 className="flex-1 text-center text-xl font-semibold text-base-text capitalize">
          Categories
        </h1>
        <div className="size-10 shrink-0" aria-hidden />
      </div>

      {/* Category list */}
      <div className="px-6 space-y-3">
        {categories.map((tag) => (
          <CategoryCard
            key={tag.id}
            slug={tag.slug}
            name={tag.name}
            config={getCategoryConfig(tag.slug)}
          />
        ))}
      </div>
    </div>
  );
}
