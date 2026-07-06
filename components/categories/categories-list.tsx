"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { CategoryCard } from "@/components/categories/category-card";
import { getCategoryConfig } from "@/lib/category-config";
import { useAccess } from "@/components/providers/access-provider";
import { PaywallModal } from "../paywall/paywall-modal";
import { SignInModal } from "@/components/auth/SignInModal";

interface Categories {
  display_order: number;
  id: string;
  name: string;
  slug: string;
}

const CategoriesList = ({ categories }: { categories: Categories[] }) => {
  const router = useRouter();
  const { hasAccess, isAuthenticated } = useAccess();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [showSignInModal, setShowSignInModal] = React.useState(false);

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
    </>
  );
};

export default CategoriesList;
