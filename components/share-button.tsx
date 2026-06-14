"use client";

import { useState, useRef, useEffect } from "react";
import {
  Share,
  Copy,
  Check,
  Facebook,
  Twitter,
  MessageCircle,
  Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  recipeId: string;
  recipeTitle: string;
  text: string;
  addText: string;
}

export function ShareButton({
  recipeId,
  recipeTitle,
  text,
  addText,
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const showText = addText === "show";

  const recipeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/recipes/${recipeId}`
      : "";

  const shareText = `Check out this recipe: ${recipeTitle}`;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(recipeUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Recipe link copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setIsOpen(false), 500);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const shareOptions = [
    {
      icon: Copy,
      label: "Copy Link",
      action: handleCopyLink,
    },
    {
      icon: Twitter,
      label: "Share on Twitter",
      action: () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          shareText,
        )}&url=${encodeURIComponent(recipeUrl)}`;
        window.open(url, "_blank", "width=550,height=420");
      },
    },
    {
      icon: Facebook,
      label: "Share on Facebook",
      action: () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          recipeUrl,
        )}`;
        window.open(url, "_blank", "width=550,height=450,noopener,noreferrer");
      },
    },
    {
      icon: MessageCircle,
      label: "Share on WhatsApp",
      action: () => {
        const url = `https://wa.me/?text=${encodeURIComponent(
          shareText + " " + recipeUrl,
        )}`;
        window.open(url, "_blank");
      },
    },
    {
      icon: Mail,
      label: "Share via Email",
      action: () => {
        const url = `mailto:?subject=${encodeURIComponent(
          recipeTitle,
        )}&body=${encodeURIComponent(shareText + "\n" + recipeUrl)}`;
        window.location.href = url;
      },
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded-full hover:opacity-70 transition-opacity flex items-center ${
          showText
            ? "border border-[#C4CAC8] bg-inherit px-3 py-3"
            : "bg-[#E8E6DC] p-3"
        }`}
        aria-label="Share recipe"
      >
        <Share strokeWidth={2.5} size={16} color="#57605E" />
        {showText && (
          <span className="ml-1 font-medium text-sm text-[#727E7A] text-nowrap">
            {text}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-13 bg-card border border-border rounded-2xl shadow-lg z-50 min-w-56 overflow-hidden">
          <div className="p-3 space-y-1">
            {shareOptions.map((option) => {
              const Icon = option.icon;
              const isActive = copied && option.label === "Copy Link";
              return (
                <button
                  key={option.label}
                  onClick={() => {
                    option.action();
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm transition-colors",
                    isActive
                      ? "bg-foreground/10 text-foreground"
                      : "hover:bg-foreground/5 text-foreground/80 hover:text-foreground",
                  )}
                >
                  {isActive && option.label === "Copy Link" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
