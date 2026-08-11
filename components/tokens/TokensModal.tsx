"use client";

import React from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";

import { CoinAnimation } from "./CoinAnimation";
import { createClient } from "@/lib/supabase/client";

const TokensModal = ({ onClose }: { onClose?: () => void }) => {
  const router = useRouter();
  const [isSubscriber, setIsSubscriber] = React.useState(false);

  React.useEffect(() => {
    const fetchUser = async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const supabase = await createClient();
        const { data } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.status === "active") {
          setIsSubscriber(true);
        }
      }
    };
    fetchUser();
  }, []);

  // If the parent passes onClose, use it. Otherwise fall back to routing home.
  const handleClose = onClose ?? (() => router.push("/"));
  return (
    <div className="bg-white rounded-2xl py-6.25 px-6 flex flex-col gap-5.5 items-center">
      <div className="bg-[#FFF7EC] rounded-full size-18 grid place-items-center">
        <CoinAnimation />
      </div>
      <div className="flex flex-col gap-3.25 text-center">
        <p className="font-semibold text-title text-[#1B1D1D]">
          Need more tokens?
        </p>
        <p className="font-medium text-subtle text-base">
          You can buy extra tokens to continue using this feature right away.
        </p>
      </div>
      <div className="w-full flex flex-col gap-4">
        {isSubscriber ? (
          <Link
            href="/buy-tokens"
            className="w-full flex gap-1 justify-center items-center rounded-full py-3.75 bg-mint-green"
          >
            <Zap size={18} color="#FFFFFF" strokeWidth={2} />
            <span className="text-white font-medium text-base">
              Get extra tokens
            </span>
          </Link>
        ) : (
          <Link
            href="/buy-tokens"
            className="w-full flex gap-1 justify-center items-center rounded-full py-3.75 bg-mint-green"
          >
            <Zap size={18} color="#FFFFFF" strokeWidth={2} />
            <span className="text-white font-medium text-base">
              Get extra tokens
            </span>
          </Link>
        )}
        <button
          onClick={handleClose}
          className="text-sm font-medium text-subtle text-center"
        >
          Wait till reset
        </button>
      </div>
    </div>
  );
};

export default TokensModal;
