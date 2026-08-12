"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { FaHeart } from "react-icons/fa";

import image from "@/public/freeTokenImage.webp";
import cash from "@/public/cash.webp";
import LineUp from "@/components/vectors/LineUp";
import CoinStack from "../vectors/CoinStack";
import { FREE_UNITS } from "@/lib/credits";

const FreeTokens = ({ onClose }: { onClose: () => void }) => {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-50 min-h-dvh bg-background pb-10 w-full overflow-y-auto">
      <div className="flex justify-end px-6 pt-5 pb-6">
        <button
          onClick={onClose}
          className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
          aria-label="Close"
        >
          <X className="size-5 text-foreground" />
        </button>
      </div>

      <div className="px-6 w-full flex flex-col items-center justify-center">
        <div className="mt-8.25 flex flex-col gap-3 items-center">
          <p className="font-semibold font-lateef text-[40px] leading-8.5 flex items-center gap-1">
            Welcome to Nuko!{" "}
            <span>
              <FaHeart size={20} color="#227B6F" />
            </span>
          </p>
          <p className="font-medium text-subtle">We’re so happy you’re here.</p>
        </div>

        <Image
          src={image}
          alt="image"
          width={700}
          height={168}
          className="mt-11.25"
        />
      </div>

      <div className="px-6 mt-13">
        <div className="flex items-center gap-[10px] py-3 px-6 bg-[#ECECE1] rounded-3xl">
          <Image src={cash} alt="cash" width={48} height={48} />
          <div className="flex flex-col gap-0.75">
            <p className="text-[#103E2A] font-semibold text-base max-[400px]:text-sm">
              You got free tokens!
            </p>
            <p className="text-sm text-base-text w-10/12 max-[400px]:w-full max-[400px]:text-xs">
              Use them to explore, find your match and recipes.
            </p>
          </div>
          <div className="relative">
            <div className="flex flex-col justify-center text-center text-white bg-[#3E6C4C] rounded-full w-22 h-22">
              <p className="font-medium text-base">FREE</p>
              <p className="font-medium text-base">TRIAL</p>
            </div>
            <div className="absolute -top-1 -right-1">
              <LineUp />
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mt-13">
        <div className="flex flex-col items-center gap-2.25">
          <button
            onClick={onClose}
            className="py-3.75 w-3/4 bg-mint-green text-white rounded-full font-medium hover:opacity-75 transition-opacity"
          >
            Let’s explore ✨
          </button>
          <p className="text-subtle text-sm flex items-center">
            <CoinStack />
            Your free tokens are ready to use
          </p>
        </div>
      </div>
    </div>
  );
};

export default FreeTokens;
