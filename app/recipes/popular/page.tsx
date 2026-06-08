import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MoveRight, Heart, Bookmark } from "lucide-react";

import { BookmarkButton } from "@/components/bookmark-button";
import image from "@/public/web-app-manifest-512x512.png";

const page = () => {
  return (
    <div className="bg-background">
      <main className="px-4 pt-3 flex flex-col gap-10">
        <div className="flex items-center justify-between">
          <Link href="/recipes" className="rounded-full bg-[#E8E6DC] p-3">
            <ArrowLeft size={20} color="#1B1D1D" strokeWidth={1.5} />
          </Link>
          <p className="font-semibold text-xl">Popular Recipes</p>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative flex flex-col gap-2">
            <div className="absolute flex justify-between px-2 top-3 left-0 right-0 z-10">
              <button className="bg-[#000000] opacity-75 flex items-center gap-1 rounded-full p-1.5 px-3">
                <Heart size={12} color="#FFFFFF" strokeWidth={2} />
                <span className="text-xs text-[#FFFFFF] opacity-100">190</span>
              </button>
              <button className="bg-[#FFFFFF] p-1.5 rounded-full">
                <Bookmark size={16} color="#227B6F" />
              </button>
            </div>
            <div className="overflow-hidden rounded-lg">
              <Image
                src={image}
                alt="productImage"
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
              />
            </div>
            <p className="text-[#727E7A] text-[12px]">INDIGESTION</p>
            <p className="text-[#111312] font-medium">Warm ginger-lemon shot</p>
          </div>

		  <div className="relative flex flex-col gap-2">
            <div className="absolute flex justify-between px-2 top-3 left-0 right-0 z-10">
              <button className="bg-[#000000] opacity-75 flex items-center gap-1 rounded-full p-1.5 px-3">
                <Heart size={12} color="#FFFFFF" strokeWidth={2} />
                <span className="text-xs text-[#FFFFFF] opacity-100">190</span>
              </button>
              <button className="bg-[#FFFFFF] p-1.5 rounded-full">
                <Bookmark size={16} color="#227B6F" />
              </button>
            </div>
            <div className="overflow-hidden rounded-lg">
              <Image
                src={image}
                alt="productImage"
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
              />
            </div>
            <p className="text-[#727E7A] text-[12px]">INDIGESTION</p>
            <p className="text-[#111312] font-medium">Warm ginger-lemon shot</p>
          </div>

		  <div className="relative flex flex-col gap-2">
            <div className="absolute flex justify-between px-2 top-3 left-0 right-0 z-10">
              <button className="bg-[#000000] opacity-75 flex items-center gap-1 rounded-full p-1.5 px-3">
                <Heart size={12} color="#FFFFFF" strokeWidth={2} />
                <span className="text-xs text-[#FFFFFF] opacity-100">190</span>
              </button>
              <button className="bg-[#FFFFFF] p-1.5 rounded-full">
                <Bookmark size={16} color="#227B6F" />
              </button>
            </div>
            <div className="overflow-hidden rounded-lg">
              <Image
                src={image}
                alt="productImage"
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
              />
            </div>
            <p className="text-[#727E7A] text-[12px]">INDIGESTION</p>
            <p className="text-[#111312] font-medium">Warm ginger-lemon shot</p>
          </div>

		  <div className="relative flex flex-col gap-2">
            <div className="absolute flex justify-between px-2 top-3 left-0 right-0 z-10">
              <button className="bg-[#000000] opacity-75 flex items-center gap-1 rounded-full p-1.5 px-3">
                <Heart size={12} color="#FFFFFF" strokeWidth={2} />
                <span className="text-xs text-[#FFFFFF] opacity-100">190</span>
              </button>
              <button className="bg-[#FFFFFF] p-1.5 rounded-full">
                <Bookmark size={16} color="#227B6F" />
              </button>
            </div>
            <div className="overflow-hidden rounded-lg">
              <Image
                src={image}
                alt="productImage"
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
              />
            </div>
            <p className="text-[#727E7A] text-[12px]">INDIGESTION</p>
            <p className="text-[#111312] font-medium">Warm ginger-lemon shot</p>
          </div>
        </div>

        <Link
          href="/recipes/find"
          className="w-full flex items-center justify-center text-[#FFFFFF] gap-3 py-4 bg-[#227B6F] hover:opacity-90 transition-opacity rounded-full font-medium"
        >
          Find a recipe <MoveRight size={16} color="#FFFFFF" />
        </Link>
      </main>
    </div>
  );
};

export default page;
