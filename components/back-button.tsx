"use client";
import { useRouter } from "next/navigation";
import { buttonVariants } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { VariantProps } from "class-variance-authority";
import { backOrHome } from "@/lib/navigation";

type BackButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    backPage?: string;
  };

function BackButton({ className, backPage }: BackButtonProps) {
  const router = useRouter();

  const handleBackClick = () => {
    if (backPage) {
      router.push(backPage);
      return;
    }

    // Falls back to home when there's no real in-app history to return to
    // (e.g. arriving via a shared link, or after the auth redirect — that
    // round trip uses router.replace so it never lingers as a "back" target).
    backOrHome(router);
  };

  return (
    <button
      data-paywall-passthrough
      onClick={handleBackClick}
      className={className}
    >
      <ArrowLeft className="size-5 text-foreground" />
    </button>
  );
}

export default BackButton;
