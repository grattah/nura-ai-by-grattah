"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import Leaf from "../vectors/leaf";
import Shield from "../vectors/shield";
import Lightning from "../vectors/lightning";
import { PaywallModal } from "../paywall/paywall-modal";
import Heart from "../vectors/heart";
import Beauty from "../vectors/beauty";
import Recovery from "../vectors/recovery";

const CATEGORIES = [
  {
    label: "Detox",
    icon: <Leaf />,
    href: "/categories/detox",
    iconBg: "#319F431F",
  },
  {
    label: "Immunity",
    icon: <Shield />,
    href: "/categories/immunity",
    iconBg: "#0D88F81F",
  },
  {
    label: "Energy",
    icon: <Lightning />,
    href: "/categories/energy",
    iconBg: "#F8BD001F",
  },
  {
    label: "Recovery",
    icon: <Recovery />,
    href: "/categories/recovery",
    iconBg: "#2C4FFF1F",
  },
  {
    label: "Beauty",
    icon: <Beauty />,
    href: "/categories/beauty",
    iconBg: "#9F31771F",
  },
  {
    label: "Heart",
    icon: <Heart />,
    href: "/categories/heart",
    iconBg: "#EA43351F",
  },
];

interface UpgradeBannerProps {
  hasAccess: boolean;
}

export function CategorySection({ hasAccess }: UpgradeBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl leading-none font-semibold text-grey-c950">
          Category
        </h2>
        {hasAccess ? (
          <Link
            href="/categories"
            className="flex items-center gap-1 text-base text-mint-green hover:opacity-75 transition-opacity underline underline-offset-4"
          >
            See all
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 text-base text-mint-green hover:opacity-75 transition-opacity underline underline-offset-4"
          >
            See all <Lock className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 w-full">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={
              hasAccess ? () => router.push(cat.href) : () => setModalOpen(true)
            }
            className="flex justify-center items-center w-full gap-2 p-3 rounded-lg bg-badge text-sm font-medium text-foreground border border-badge-border hover:opacity-80 transition-opacity active:scale-95"
          >
            <span
              className="text-sm shrink-0 leading-none -tracking-[2%] inline-flex items-center justify-center size-7 rounded-full"
              style={{ backgroundColor: cat.iconBg }}
            >
              {cat.icon}
            </span>
            {cat.label}
          </button>
        ))}
      </div>

      <PaywallModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
