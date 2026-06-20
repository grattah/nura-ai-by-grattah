"use client";

import dynamic from "next/dynamic";
import coinAnimation from "@/public/success .json";

// Defer the ~120KB lottie-react chunk until the animation actually renders.
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const SuccessAnimation = () => {
  return (
    <div style={{ width: 100, height: 100, overflow: "hidden" }}>
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
};

export default SuccessAnimation;
