import React from "react";

import BackButton from "@/components/back-button";

const page = () => {
  return (
    <div className="bg-background pb-10">
      <main className="px-6 pt-3 flex flex-col gap-10">
        <div className="flex items-center justify-between">
          <BackButton className="size-10 grid place-items-center rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
          <p className="font-semibold text-xl">Recipes for you</p>
          <div />
        </div>
      </main>
    </div>
  );
};

export default page;
