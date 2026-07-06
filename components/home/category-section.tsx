"use client";

import { useState } from "react";
import Link from "next/link";

import { PaywallModal } from "../paywall/paywall-modal";
import type { Tag } from "@/lib/types";
import { getCategoryConfig } from "@/lib/category-config";
import { CategoryCard } from "../categories/category-card";
import { useAccess } from "@/components/providers/access-provider";
import { SignInModal } from "@/components/auth/SignInModal";

interface CategorySectionProps {
  categories: Tag[];
}

export function CategorySection({ categories }: CategorySectionProps) {
  const { hasAccess, isAuthenticated } = useAccess();
  const [modalOpen, setModalOpen] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-title leading-none font-semibold text-grey-c950">
          Categories
        </h2>
        <Link
          href="/categories"
          className="flex items-center gap-1 text-base text-mint-green hover:opacity-75 transition-opacity underline underline-offset-4 font-semibold"
        >
          See all
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-2 w-full">
        {categories.slice(0, 3).map((tag) => (
          <CategoryCard
            key={tag.id}
            slug={tag.slug}
            name={tag.name}
            config={getCategoryConfig(tag.slug)}
            onClick={(e) => {
              if (!isAuthenticated) {
                e.preventDefault();
                setShowSignInModal(true);
                setModalOpen(false);
              } else if (isAuthenticated && !hasAccess) {
                e.preventDefault();
                setModalOpen(true);
                setShowSignInModal(false);
              }
            }}
          />
        ))}
      </div>

      {showSignInModal && (
        <SignInModal
          onClose={() => {
            setShowSignInModal(false);
          }}
        />
      )}

      <PaywallModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
