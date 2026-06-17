"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import Leaf from "../vectors/leaf";
import Shield from "../vectors/shield";
import Lightning from "../vectors/lightning";
import { PaywallModal } from "../paywall/paywall-modal";
import Hormones from "../vectors/horomones";
import Beauty from "../vectors/beauty";
import GutHealth from "../vectors/gutHealth";

const CATEGORIES = [
  {
    label: "Detox",
    icon: <Leaf className="max-xs:size-2.5" />,
    href: "/categories/detox",
    iconBg: "#319F431F",
  },
  {
    label: "Immunity",
    icon: <Shield className="max-xs:size-2.5" />,
    href: "/categories/immunity",
    iconBg: "#0D88F81F",
  },
  {
    label: "Energy",
    icon: <Lightning className="max-xs:size-2.5" />,
    href: "/categories/energy",
    iconBg: "#F8BD001F",
  },
  {
    label: "Gut health",
    icon: <GutHealth className="max-xs:size-2.5" />,
    href: "/categories/gut-health",
    iconBg: "#2C4FFF1F",
  },
  {
    label: "Beauty",
    icon: <Beauty className="max-xs:size-2.5" />,
    href: "/categories/beauty",
    iconBg: "#9F31771F",
  },
  {
    label: "Hormones",
    icon: <Hormones className="max-xs:size-2.5" />,
    href: "/categories/hormones",
    iconBg: "#EA43351F",
  },
];

interface UpgradeBannerProps {
  hasAccess: boolean;
}

export function CategorySection({ hasAccess }: UpgradeBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="max-xs:text-base text-2xl leading-none font-semibold text-grey-c950">
          Category
        </h2>
        {hasAccess ? (
          <Link
            href="/categories"
            className="flex items-center gap-1 max-xs:text-xs text-base text-mint-green hover:opacity-75 transition-opacity underline underline-offset-4 font-semibold"
          >
            See all
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 text-base max-xs:text-xs text-mint-green hover:opacity-75 transition-opacity underline underline-offset-4 font-semibold"
          >
            See all <Lock className="size-3 max-xs:size-1.5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 w-full">
        {CATEGORIES.map((cat) =>
          hasAccess ? (
            <Link
              key={cat.label}
              href={cat.href}
              className="flex justify-center items-center w-full max-xs:gap-1 gap-2 max-xs:p-1.5 p-3 max-xs:h-8 h-12.75 max-xs:rounded-sm rounded-lg bg-badge text-sm max-xs:text-[10px] font-medium text-base-text border border-badge-border hover:opacity-80 transition-opacity active:scale-95"
            >
              <span
                className="max-xs:text-[10px] text-xs shrink-0 leading-none inline-flex items-center justify-center max-xs:size-4 size-7 rounded-full"
                style={{ backgroundColor: cat.iconBg }}
              >
                {cat.icon}
              </span>
              <span className="text-nowrap max-xs:text-[10px] text-xs">
                {cat.label}
              </span>
            </Link>
          ) : (
            <button
              key={cat.label}
              onClick={() => setModalOpen(true)}
              className="flex justify-center items-center w-full max-2xs:gap-1 gap-2 p-3 rounded-lg bg-badge text-sm font-medium text-foreground border border-badge-border hover:opacity-80 transition-opacity active:scale-95"
            >
              <span
                className="text-sm shrink-0 leading-none -tracking-[2%] inline-flex items-center justify-center size-7 rounded-full"
                style={{ backgroundColor: cat.iconBg }}
              >
                {cat.icon}
              </span>
              <span className="text-nowrap max-2xs:text-[10px] text-xs">
                {cat.label}
              </span>
            </button>
          ),
        )}
      </div>

      <PaywallModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
