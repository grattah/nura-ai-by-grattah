"use client";

import Lottie from "lottie-react";
import coinAnimation from "@/public/success .json";

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
