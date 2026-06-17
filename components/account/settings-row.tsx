import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";

interface SettingsRowProps {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "danger";
}

export function SettingsRow({
  icon,
  label,
  href,
  onClick,
  variant = "default",
}: SettingsRowProps) {
  const textClass = variant === "danger" ? "text-error-c500" : "text-base-text";

  const inner = (
    <div className="flex items-center justify-between px-4 max-xs:px-3 py-4 max-xs:py-3 min-h-14">
      <div className="flex items-center gap-3 max-xs:gap-2">
        <div className="w-8 h-8 rounded-full bg-[#F3F1E8] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className={`text-base max-xs:text-sm font-medium ${textClass}`}>
          {label}
        </span>
      </div>
      <ChevronRight className={`w-4 h-4 ${textClass}`} />
    </div>
  );

  const cls =
    "block bg-card border border-[#E3E1D880] rounded-2xl hover:opacity-80 transition-opacity active:scale-[0.98]";

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={`w-full text-left ${cls}`}>
      {inner}
    </button>
  );
}
