"use client";
import { useRouter } from "next/navigation";
import { buttonVariants } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { VariantProps } from "class-variance-authority";

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

    router.back();
  };

  return (
    <button
      data-paywall-passthrough
      onClick={handleBackClick}
      className={className}
    >
      <ArrowLeft size={16} color="#1B1D1D" />
    </button>
  );
}

export default BackButton;
