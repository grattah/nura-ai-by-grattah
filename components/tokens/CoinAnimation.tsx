"use client";

import dynamic from "next/dynamic";
import coinAnimation from "@/public/coin.json";

// Defer the ~120KB lottie-react chunk until the animation actually renders.
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export function CoinAnimation() {
  return (
    <div style={{ width: 40, height: 40, overflow: "hidden" }}>
      <Lottie
        animationData={coinAnimation}
        loop
        autoplay
        style={{
          width: "150%",
          height: "150%",
          margin: "-25%", // pull it back so the enlarged art stays centered
        }}
      />
    </div>
  );
}