import { useEffect, useState } from "react";
import { Download, PlusSquare, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "selfmanage_pwa_dismissed_until";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2. Check if user dismissed prompt recently
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/crios|fxios|chrome/.test(userAgent);

    if (isAppleMobile && isSafari) {
      setIsIos(true);
      // Delay showing so user sees content first
      const timer = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(timer);
    }

    // 4. Android / Chromium beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Slight delay for smooth entrance
      setTimeout(() => setVisible(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      }
    } catch {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    // Dismiss for 7 days
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Notifikasi pemasangan aplikasi PWA"
      data-testid="pwa-install-prompt"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm animate-rise-in rounded-2xl border border-primary/30 bg-card/95 p-4 text-foreground shadow-2xl shadow-black/40 backdrop-blur-xl sm:bottom-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Smartphone size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading text-sm font-bold text-foreground">
              Pasang _self.manage di HP
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Akses cepat satu ketukan langsung dari layar utama tanpa browser bar.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Tutup notifikasi"
          data-testid="pwa-dismiss-button"
          className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X size={15} />
        </button>
      </div>

      {isIos ? (
        <div className="mt-3 border-t border-border/50 pt-3">
          {!showIosGuide ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Khusus Safari iPhone/iPad</span>
              <Button
                size="sm"
                data-testid="pwa-ios-instructions-button"
                onClick={() => setShowIosGuide(true)}
                className="h-8 gap-1.5 px-3 text-xs font-bold"
              >
                <Share size={13} /> Cara Pasang
              </Button>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl bg-secondary/50 p-2.5 text-xs text-muted-foreground animate-rise-in">
              <p className="flex items-center gap-2 text-foreground font-semibold text-[11px]">
                <Share size={14} className="text-primary" /> 1. Ketuk ikon <span className="font-bold text-primary">Bagikan (Share)</span> di Safari
              </p>
              <p className="flex items-center gap-2 text-foreground font-semibold text-[11px]">
                <PlusSquare size={14} className="text-primary" /> 2. Pilih <span className="font-bold text-primary">"Tambahkan ke Layar Utama"</span>
              </p>
              <p className="text-[10px] text-muted-foreground pl-5.5">
                3. Ketuk "Tambah" di kanan atas. Selesai!
              </p>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-[10px] text-primary underline mt-1 block"
              >
                Sembunyikan panduan
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            Nanti Saja
          </Button>
          <Button
            size="sm"
            data-testid="pwa-install-button"
            onClick={handleInstallClick}
            className="h-8 gap-1.5 px-4 text-xs font-bold shadow-md shadow-primary/20"
          >
            <Download size={13} /> Pasang Sekarang
          </Button>
        </div>
      )}
    </div>
  );
}
