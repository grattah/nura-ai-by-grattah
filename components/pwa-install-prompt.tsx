"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Share, Ellipsis } from "lucide-react";
import { HiOutlineMenuAlt2 } from "react-icons/hi";

import { useAccess } from "@/components/providers/access-provider";
import AppIcon from "./vectors/AppIcon";
import findInHomeScreen from "@/public/findInHomeScreen.webp";
import allSetImage from "@/public/allSetModal.webp";
import toolBar from "@/public/toolBarSafari.webp";
import shareButtonSafari from "@/public/shareButtonSafari.webp";
import shareButtonChrome from "@/public/shareButtonChrome.webp";
import addHomeScreen from "@/public/addToHomeScreen.webp";
import SuccessAnimation from "@/components/SuccessAnimation";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "nura_pwa_prompt_dismissed";
const DISMISS_TTL_DAYS = 2;

type IOSBrowser = "safari" | "crios" | "fxios" | "edgios" | "other";

function getIOSBrowser(): IOSBrowser {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (!/iphone|ipad|ipod/i.test(ua)) return "other";

  if (/CriOS\//i.test(ua)) return "crios";
  if (/FxiOS\//i.test(ua)) return "fxios";
  if (/EdgiOS\//i.test(ua)) return "edgios";
  // Real Safari: has Safari/ but none of the third-party tokens above.
  if (/Safari\//i.test(ua)) return "safari";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    const cutoff = Date.now() - DISMISS_TTL_DAYS * 24 * 60 * 60 * 1000;
    return ts > cutoff;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {}
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type PromptMode = "ios-safari" | "ios-chrome" | "android" | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __nukoBip?: BeforeInstallPromptEvent | null;
  }
}

const SHEET_MS = 300;

// ─── Component ─────────────────────────────────────────────────────────────────

export function PWAInstallPrompt() {
  const { hasAccess, isLoading, isSubscriber } = useAccess();
  const [sheetIn, setSheetIn] = useState(false);
  const [mode, setMode] = useState<PromptMode>(null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (window.__nukoBip) {
      setDeferredPrompt(window.__nukoBip);
      setMode("android");
    }
    const onBip = () => {
      if (window.__nukoBip) {
        setDeferredPrompt(window.__nukoBip);
        setMode("android");
      }
    };
    // Backup direct listener in case the event fires after mount.
    const onDirect = (e: Event) => {
      e.preventDefault();
      window.__nukoBip = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode("android");
    };
    const onInstalled = () => {
      window.__nukoBip = null;
      setDeferredPrompt(null);
      setVisible(false);
      // setModalOpen(true);
    };
    window.addEventListener("nuko:bip", onBip);
    window.addEventListener("beforeinstallprompt", onDirect);
    window.addEventListener("nuko:installed", onInstalled);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("nuko:bip", onBip);
      window.removeEventListener("beforeinstallprompt", onDirect);
      window.removeEventListener("nuko:installed", onInstalled);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isSubscriber || isStandalone() || wasDismissedRecently()) {
      setVisible(false);
      return;
    }

    const browser = getIOSBrowser();
    const iosEligible = browser === "safari" || browser === "crios";
    const androidEligible = !!deferredPrompt;
    if (!iosEligible && !androidEligible) return;

    const timer = setTimeout(() => {
      setMode(
        browser === "safari"
          ? "ios-safari"
          : browser === "crios"
          ? "ios-chrome"
          : "android"
      );
      setVisible(true);
    }, 30_000);

    return () => clearTimeout(timer);
  }, [isLoading, deferredPrompt, isSubscriber]);

  useEffect(() => {
    if (!visible || mode === "android") return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setSheetIn(true))
    );
    return () => cancelAnimationFrame(id);
  }, [visible, mode]);

  const finishClose = () => {
    setSheetIn(false);
    window.setTimeout(() => setVisible(false), SHEET_MS);
  };

  const dismiss = () => {
    if (mode === "android") {
      setVisible(false);
      markDismissed();
      return;
    }
    markDismissed();
    finishClose();
  };

  const closeForNow = () => {
    if (mode === "android") {
      setVisible(false);
      return;
    }
    finishClose();
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "dismissed") {
      setVisible(false);
      markDismissed();
    } else if (outcome === "accepted") {
      setVisible(false);
      setModalOpen(true);
      markDismissed();
    }
    setDeferredPrompt(null);
    window.__nukoBip = null;
  };

  if (!visible && !modalOpen) return null;

  return (
    <>
      {visible && mode && (
        <div
          className={`fixed inset-0 h-dvh z-50 flex justify-center ${
            mode === "android" ? "items-center px-6" : "items-end px-0"
          }`}
        >
          <button
            type="button"
            aria-label="Close"
            className={cn(
              "absolute inset-0 bg-black/20 backdrop-blur-xs",
              mode !== "android" && "transition-opacity duration-300",
              mode !== "android" && (sheetIn ? "opacity-100" : "opacity-0")
            )}
            onClick={closeForNow}
          />

          <div
            className={cn(
              "relative w-full flex flex-col items-center",
              mode === "android"
                ? "rounded-3xl bg-white p-6 max-w-96.5"
                : "rounded-t-4xl max-h-[85vh] bg-[#FAFAF9] px-5 pt-3 pb-12 max-w-md",
              mode !== "android" &&
                "transition-transform duration-300 ease-out",
              mode !== "android" &&
                (sheetIn ? "translate-y-0" : "translate-y-full")
            )}
          >
            {mode !== "android" && (
              <div className="flex justify-center shrink-0">
                <div className="h-1 w-10 rounded-full bg-grey-c200" />
              </div>
            )}

            <div className="absolute top-4 right-4.5">
              <button
                onClick={dismiss}
                className="size-7.5 rounded-full bg-grey-c100 flex items-center justify-center hover:opacity-75 transition-opacity"
                aria-label="Close"
              >
                <X className="size-4.5 text-foreground" />
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center gap-4">
              <AppIcon />

              {mode === "ios-safari" ? (
                <div className="flex flex-col gap-1 text-center">
                  <p className="text-hero leading-6.5 font-semibold">
                    Add Nuko to your home screen
                  </p>
                  <p className="text-subtle text-sm font-medium">
                    Add Nuko to your home screen in 4 steps
                  </p>
                </div>
              ) : mode === "ios-chrome" ? (
                <div className="flex flex-col gap-1 text-center">
                  <p className="text-hero leading-6.5 font-semibold">
                    Add Nuko to your home screen
                  </p>
                  <p className="text-subtle text-sm font-medium">
                    Add Nuko to your home screen in 3 steps
                  </p>
                </div>
              ) : null}
            </div>

            {/* Mode-specific instructions / CTA */}
            {mode === "ios-safari" && (
              <div className="mt-4 overflow-y-auto hide-scrollbar">
                <div className="flex flex-col gap-4.25">
                  <div className="flex flex-col gap-3 items-center text-center pb-4 px-6 bg-white border border-grey-c200 rounded-4xl">
                    <Image src={toolBar} alt="icon image" className="w-50.75" />
                    <div className="flex flex-col gap-1 items-center">
                      <p className="text-base-text font-semibold text-xl">
                        Open the Safari toolbar
                      </p>
                      <p className="font-medium text-subtle text-sm">
                        Tap the three dots{" "}
                        <span className="p-1 bg-[#227B6F1A] rounded-full inline-flex items-center align-middle">
                          <Ellipsis
                            size={14}
                            color="#227B6F"
                            strokeWidth={1.25}
                          />
                        </span>{" "}
                        or menu icon{" "}
                        <span className="p-1  bg-[#227B6F1A] rounded-full inline-flex items-center align-middle">
                          <HiOutlineMenuAlt2
                            size={14}
                            color="#227B6F"
                            strokeWidth={1.25}
                          />
                        </span>{" "}
                        next to the Safari bar showing “nuko.health".
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 items-center text-center pb-4 px-6 bg-white border border-grey-c200 rounded-4xl">
                    <Image
                      src={shareButtonSafari}
                      alt="icon image"
                      className="w-50.75"
                    />
                    <div className="flex flex-col gap-1 items-center">
                      <p className="text-base-text font-semibold text-xl">
                        Tap the share icon
                      </p>
                      <p className="font-medium text-subtle text-sm">
                        Tap the Share{" "}
                        <span className="p-1 bg-[#227B6F1A] rounded-full inline-flex items-center align-middle">
                          <Share size={14} color="#227B6F" strokeWidth={1.25} />
                        </span>{" "}
                        button in the toolbar.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 items-center text-center pb-4 px-6 bg-white border border-grey-c200 rounded-4xl">
                    <Image
                      src={addHomeScreen}
                      alt="icon image"
                      className="w-50.75"
                    />
                    <div className="flex flex-col gap-1 items-center">
                      <p className="text-base-text font-semibold text-xl">
                        Select “Add to Home Screen”
                      </p>
                      <p className="font-medium text-subtle text-sm">
                        Scroll down and tap on{" "}
                        <span className="text-base-text font-semibold">
                          “Add to Home Screen”.
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 items-center text-center pb-4 px-6 bg-white border border-grey-c200 rounded-4xl">
                    <Image
                      src={findInHomeScreen}
                      alt="icon image"
                      className="w-50.75"
                    />
                    <div className="flex flex-col gap-1">
                      <p className="text-base-text font-semibold text-xl">
                        Find Nuko on your homescreen
                      </p>
                      <p className="font-medium text-subtle text-sm">
                        Nuko has been added! You can now find and open it from
                        your homescreen.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-[36px]">
                  <button
                    className="text-white py-3 rounded-full bg-mint-green font-medium text-sm"
                    onClick={dismiss}
                  >
                    Done
                  </button>
                  <p className="text-xs font-medium text-subtle text-center">
                    You’re all set!
                  </p>
                </div>
              </div>
            )}

            {mode === "ios-chrome" && (
              <div className="mt-4 overflow-y-auto hide-scrollbar">
                <div className="flex flex-col gap-4.25">
                  <div className="flex flex-col gap-3 items-center text-center pb-4 px-6 bg-white border border-grey-c200 rounded-4xl">
                    <Image
                      src={shareButtonChrome}
                      alt="icon image"
                      className="w-50.75"
                    />
                    <div className="flex flex-col gap-1 items-center">
                      <p className="text-base-text font-semibold text-xl">
                        Tap the share icon
                      </p>
                      <p className="font-medium text-subtle text-sm">
                        Tap the Share{" "}
                        <span className="p-1 bg-[#227B6F1A] rounded-full inline-flex items-center align-middle">
                          <Share size={14} color="#227B6F" strokeWidth={1.25} />
                        </span>{" "}
                        button next to the Chrome bar showing “nuko.health”.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 items-center text-center pb-4 px-6 bg-white border border-grey-c200 rounded-4xl">
                    <Image
                      src={addHomeScreen}
                      alt="icon image"
                      className="w-50.75"
                    />
                    <div className="flex flex-col gap-1 items-center">
                      <p className="text-base-text font-semibold text-xl">
                        Select “Add to Home Screen”
                      </p>
                      <p className="font-medium text-subtle text-sm">
                        Scroll down and tap on{" "}
                        <span className="text-base-text font-semibold">
                          “Add to Home Screen”.
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 items-center text-center pb-4 px-6 bg-white border border-grey-c200 rounded-4xl">
                    <Image
                      src={findInHomeScreen}
                      alt="icon image"
                      className="w-50.75"
                    />
                    <div className="flex flex-col gap-1">
                      <p className="text-base-text font-semibold text-xl">
                        Find Nuko on your homescreen
                      </p>
                      <p className="font-medium text-subtle text-sm">
                        Nuko has been added! You can now find and open it from
                        your homescreen.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-[36px]">
                  <button
                    className="text-white py-3 rounded-full bg-mint-green font-medium text-sm"
                    onClick={dismiss}
                  >
                    Done
                  </button>
                  <p className="text-xs font-medium text-subtle text-center">
                    You’re all set!
                  </p>
                </div>
              </div>
            )}

            {mode === "android" && (
              <div className="flex flex-col gap-4 items-center mt-4">
                <div className="flex flex-col gap-1 text-center  px-6">
                  <p className="text-hero leading-6.5 font-semibold">
                    Install Nuko
                  </p>
                  <p className="text-subtle text-sm font-medium">
                    Add Nuko to your home screen for the best experience
                  </p>
                </div>
                <button
                  onClick={handleAndroidInstall}
                  className="w-fit px-15 rounded-full py-3 bg-mint-green text-white font-medium text-sm"
                >
                  Add to home screen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 h-dvh z-50 flex items-center justify-center px-6">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/20 backdrop-blur-xs"
            onClick={() => setModalOpen(false)}
          />

          <div className="relative w-full max-w-96.5 bg-white rounded-3xl px-6 pt-4 pb-6 flex flex-col items-center">
            <div className="absolute top-2 right-2.5">
              <button
                onClick={() => setModalOpen(false)}
                className="size-7.5 rounded-full bg-grey-c100 flex items-center justify-center hover:opacity-75 transition-opacity"
                aria-label="Close"
              >
                <X className="size-4.5 text-foreground" />
              </button>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <div className="flex justify-center items-center text-center">
                <SuccessAnimation />
              </div>
              <div className="flex flex-col gap-2 text-center">
                <p className="text-hero leading-6.5 font-semibold">
                  You’re all set!
                </p>
                <p className="text-subtle text-sm font-medium">
                  Nuko is now on your home screen.
                </p>
              </div>
              <Image src={allSetImage} alt="image" className="" />
              <button
                className="text-white py-3 rounded-full bg-mint-green font-medium text-sm"
                onClick={() => setModalOpen(false)}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
