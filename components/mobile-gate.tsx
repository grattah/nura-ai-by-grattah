"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nurai.com";

interface MobileGateProps {
  children: React.ReactNode;
}

export function MobileGate({ children }: MobileGateProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (isMobile === null) return null;
  if (isMobile) return <>{children}</>;

  return <DesktopBlocker />;
}

function DesktopBlocker() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-8 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
        style={{ backgroundColor: "#5C6B3A" }}
      >
        <PhoneIcon />
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-3 leading-tight">
        Nura is a mobile app
      </h1>
      <p className="text-base text-muted-foreground leading-relaxed max-w-xs mb-8">
        Scan the code below with your phone to open Nura. You can add it to your
        home screen for instant access.
      </p>

      {/* QR code — always white bg so the code is scannable in dark mode */}
      <div className="bg-white rounded-3xl p-5 mb-6 shadow-sm">
        <QRCodeSVG
          value={APP_URL}
          size={180}
          bgColor="#ffffff"
          fgColor="#2d362e"
          level="M"
          marginSize={0}
        />
      </div>

      {/* URL pill */}
      <div className="flex items-center justify-center gap-2 bg-card rounded-full px-5 py-3">
        <span className="text-sm font-mono text-muted-foreground select-all">
          {APP_URL.replace(/^https?:\/\//, "")}
        </span>
      </div>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="10"
        y="4"
        width="16"
        height="28"
        rx="3"
        stroke="#D4C48A"
        strokeWidth="1.75"
        fill="none"
      />
      <line
        x1="14"
        y1="8"
        x2="22"
        y2="8"
        stroke="#D4C48A"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="18" cy="28" r="1.25" fill="#D4C48A" />
    </svg>
  );
}
