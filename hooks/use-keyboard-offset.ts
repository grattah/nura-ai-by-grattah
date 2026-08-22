"use client";

import { useEffect, useState } from "react";

export function useKeyboardOffset(active: boolean) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!active) return;
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const update = () => {
      const hiddenByKeyboard = Math.max(
        0,
        window.innerHeight - visualViewport.height - visualViewport.offsetTop,
      );
      setOffset(Math.round(hiddenByKeyboard));
    };

    update();
    visualViewport.addEventListener("resize", update);
    visualViewport.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);
    return () => {
      visualViewport.removeEventListener("resize", update);
      visualViewport.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [active]);

  return offset;
}
