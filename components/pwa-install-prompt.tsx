"use client";

import { useEffect, useState } from "react";
import { X, Share, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NuraLeafIcon } from "@/components/nura-logo";

const STORAGE_KEY = "nura_pwa_prompt_dismissed";
const DISMISS_TTL_DAYS = 30;

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
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

type PromptMode = "ios" | "android" | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PWAInstallPrompt() {
  const [mode, setMode] = useState<PromptMode>(null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed or dismissed recently → do nothing
    if (isStandalone() || wasDismissedRecently()) return;

    // iOS Safari — show our custom modal with instructions
    if (isIOS() && isSafari()) {
      setMode("ios");
      setVisible(true);
      return;
    }

    // Android / Chrome — intercept the browser's native prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode("android");
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    markDismissed();
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setVisible(false);
      markDismissed();
    }
    setDeferredPrompt(null);
  };

  if (!visible || !mode) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-label="Install Nura app"
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl border-t border-border animate-in slide-in-from-bottom duration-300"
      >
        {/* Drag handle */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-muted" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <NuraLeafIcon size="sm" />
            <div>
              <p className="text-base font-bold text-foreground leading-tight">
                Install Nura
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add to your home screen for the best experience
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={dismiss}
            className="w-9 h-9 rounded-full bg-muted text-muted-foreground hover:opacity-70 -mt-1 -mr-1 shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Benefits list */}
        <ul className="space-y-2 mb-5">
          {[
            "Works offline — access recipes anytime",
            "Instant launch from your home screen",
            "Full-screen experience, no browser chrome",
          ].map((benefit) => (
            <li
              key={benefit}
              className="flex items-center gap-2.5 text-sm text-muted-foreground"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-nura-peach shrink-0" />
              {benefit}
            </li>
          ))}
        </ul>

        {/* Mode-specific instructions / CTA */}
        {mode === "ios" && (
          <div className="space-y-3">
            {/* Step-by-step iOS instructions */}
            <div className="bg-muted rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                How to install
              </p>
              {[
                {
                  icon: <Share className="w-4 h-4 text-foreground/70" />,
                  text: (
                    <>
                      Tap the{" "}
                      <Share className="w-3.5 h-3.5 inline-block relative -top-px" />{" "}
                      <strong>Share</strong> icon in Safari's toolbar
                    </>
                  ),
                },
                {
                  icon: <Plus className="w-4 h-4 text-foreground/70" />,
                  text: (
                    <>
                      Scroll down and tap <strong>"Add to Home Screen"</strong>
                    </>
                  ),
                },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 text-xs font-bold text-foreground/60">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground/80 leading-snug">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
            <Button
              onClick={dismiss}
              variant="ghost"
              className="w-full rounded-full h-12 text-sm text-muted-foreground hover:opacity-70"
            >
              Maybe later
            </Button>
          </div>
        )}

        {mode === "android" && (
          <div className="space-y-3">
            <Button
              onClick={handleAndroidInstall}
              className="w-full rounded-full h-13 text-base font-semibold bg-nura-cream text-nura-forest hover:opacity-90 transition-opacity border-0 shadow-none flex items-center gap-2"
            >
              <Download className="w-4.5 h-4.5" />
              Add to Home Screen
            </Button>
            <Button
              onClick={dismiss}
              variant="ghost"
              className="w-full rounded-full h-11 text-sm text-muted-foreground hover:opacity-70"
            >
              Not now
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
