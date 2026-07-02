"use client";

import React from "react";

import { CategoryCard } from "@/components/categories/category-card";
import { getCategoryConfig } from "@/lib/category-config";
import { useAccess } from "@/components/providers/access-provider";
import { PaywallModal } from "../paywall/paywall-modal";

interface Categories {
  display_order: number;
  id: string;
  name: string;
  slug: string;
}

const CategoriesList = ({ categories }: { categories: Categories[] }) => {
  const { hasAccess } = useAccess();
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <>
      <div className="px-6 space-y-3">
        {categories.map((tag) => (
          <CategoryCard
            key={tag.id}
            slug={tag.slug}
            name={tag.name}
            config={getCategoryConfig(tag.slug)}
            onClick={(e) => {
              if (!hasAccess) {
                e.preventDefault();
                setModalOpen(true);
              }
            }}
          />
        ))}
      </div>

      <PaywallModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
};

export default CategoriesList;
