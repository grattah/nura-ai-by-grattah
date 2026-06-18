"use client";

import Lottie from "lottie-react";
import coinAnimation from "@/public/coin.json";

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