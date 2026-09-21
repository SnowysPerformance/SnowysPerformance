"use client";
import { useEffect, useState } from "react";

const DISMISS_KEY = "installPromptDismissedAt";
const DISMISS_DAYS = 14;

// A small, dismissible banner that offers to add the app to the phone's
// home screen — so athletes and coaches can open it with one tap instead of
// searching for the site every time. On Android/Chrome it captures the
// browser's native install prompt and triggers it from our own button; iOS
// Safari doesn't support that, so it shows the manual Share > Add to Home
// Screen steps instead. Only ever shown on phone-width screens, never when
// the app is already installed, and it remembers a dismissal for two weeks.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Chrome/Android require an active service worker before they'll treat
    // this as an installable app. It does no caching of its own — this
    // app's data changes constantly, so a cached/stale page would be worse
    // than none — it only exists to satisfy that requirement safely.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Already running from the home-screen icon — nothing to offer.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    if (standalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      setPlatform("ios");
      setVisible(true);
      return;
    }

    function onBeforeInstallPrompt(e: any) {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform("android");
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="md:hidden fixed bottom-3 inset-x-3 z-50 bg-surface border border-edge rounded-lg p-3 flex items-center gap-3 shadow-lg">
      <span className="text-xl flex-shrink-0">❄️</span>
      <div className="flex-1 min-w-0 text-xs text-muted">
        {platform === "ios" ? (
          <>
            Add Snowy's Performance to your Home Screen: tap <span className="text-primary font-medium">Share</span>{" "}
            then <span className="text-primary font-medium">"Add to Home Screen."</span>
          </>
        ) : (
          <>Install Snowy's Performance for one-tap access, right from your home screen.</>
        )}
      </div>
      {platform === "android" && (
        <button onClick={install} className="bg-accent text-accenttext text-xs font-semibold rounded px-3 py-1.5 flex-shrink-0">
          Install
        </button>
      )}
      <button onClick={dismiss} aria-label="Dismiss" className="text-faint hover:text-primary flex-shrink-0">
      ✕
      </button>
    </div>
  );
}
