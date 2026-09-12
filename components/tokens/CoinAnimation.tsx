"use client";

import dynamic from "next/dynamic";
import coinAnimation from "@/public/coin.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export function CoinAnimation() {
  return (
    <div style={{ width: 72, height: 72, overflow: "hidden" }}>
      <Lottie
        animationData={coinAnimation}
        loop
        autoplay
        style={{
          width: "150%",
          height: "150%",
          margin: "-25%",
        }}
      />
    </div>
  );
}
