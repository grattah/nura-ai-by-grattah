import Link from "next/link";
import { Lock } from "lucide-react";
import Leaf from "../vectors/leaf";
import Shield from "../vectors/shield";
import Lightning from "../vectors/lightning";

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
];

interface UpgradeBannerProps {
  hasAccess: boolean;
}

export function CategorySection({ hasAccess }: UpgradeBannerProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl leading-none font-semibold text-grey-c950">
          Category
        </h2>
        <Link
          href="/categories"
          className="flex items-center gap-1 text-base text-mint-green hover:opacity-75 transition-opacity underline underline-offset-4"
        >
          See all {!hasAccess && <Lock className="w-3 h-3" />}
        </Link>
      </div>
      <div className="flex gap-2 w-full">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.label}
            href={cat.href}
            className="flex justify-center items-center w-full gap-2 p-3 rounded-lg bg-badge text-sm font-medium text-foreground border border-badge-border hover:opacity-80 transition-opacity active:scale-95"
          >
            <span
              className="text-sm leading-none -tracking-[2%] inline-flex items-center justify-center size-7 rounded-full"
              style={{ backgroundColor: cat.iconBg }}
            >
              {cat.icon}
            </span>
            {cat.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
