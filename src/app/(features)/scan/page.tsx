// Path: src/app/(features)/scan/page.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, Camera, CameraOff, Search, ExternalLink, RotateCcw, QrCode, Keyboard, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ScanState = "idle" | "starting" | "scanning" | "found" | "not-found" | "error";

export default function ScanPage() {
  const { t } = useI18n();
  const router = useRouter();
  const scannerRef = useRef<any>(null);
  const runningRef = useRef(false);
  const mountedRef = useRef(true);
  const [state, setState] = useState<ScanState>("idle");
  const [scannedCode, setScannedCode] = useState("");
  const [assetInfo, setAssetInfo] = useState<{ id: string; name: string; code: string; status: string } | null>(null);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner || !runningRef.current) return;
    runningRef.current = false;
    try {
      await scanner.stop();
    } catch {
      // already stopped or transitioning — ignore
    }
    try {
      scanner.clear();
    } catch {
      // ignore
    }
    scannerRef.current = null;
  }, []);

  const lookupAsset = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/assets/lookup?code=${encodeURIComponent(code)}`);
      if (!mountedRef.current) return;
      if (res.ok) {
        const data = await res.json();
        setAssetInfo(data);
        setState("found");
      } else {
        setState("not-found");
      }
    } catch {
      if (mountedRef.current) setState("not-found");
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (runningRef.current || state === "starting") return;
    setState("starting");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!mountedRef.current) return;

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
        (decodedText: string) => {
          // Decode handler — stop camera, then process
          let code = decodedText;
          const match = decodedText.match(/\/asset\/([^/?#]+)/);
          if (match) code = match[1];
          setScannedCode(code);
          stopScanner().finally(() => {
            if (mountedRef.current) lookupAsset(code);
          });
        },
        () => {} // ignore scan failures
      );

      if (!mountedRef.current) {
        // Unmounted while starting — tear down immediately
        runningRef.current = true;
        await stopScanner();
        return;
      }

      runningRef.current = true;
      setState("scanning");
    } catch {
      scannerRef.current = null;
      runningRef.current = false;
      if (mountedRef.current) setState("error");
    }
  }, [state, stopScanner, lookupAsset]);

  // Mount/unmount guard — guarantees camera is released on navigation
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Fire-and-forget stop; runningRef guards against double-stop
      const scanner = scannerRef.current;
      if (scanner && runningRef.current) {
        runningRef.current = false;
        scanner.stop().catch(() => {}).finally(() => {
          try { scanner.clear(); } catch { /* ignore */ }
        });
      }
    };
  }, []);

  // Also stop when tab becomes hidden (extra safety for mobile)
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && runningRef.current) {
        stopScanner();
        setState("idle");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [stopScanner]);

  const resetScan = useCallback(async () => {
    await stopScanner();
    setScannedCode("");
    setAssetInfo(null);
    setState("idle");
  }, [stopScanner]);

  const handleStopClick = useCallback(async () => {
    await stopScanner();
    setState("idle");
  }, [stopScanner]);

  const showReader = state === "scanning" || state === "starting";

  return (
    <div className="max-w-xl mx-auto py-4 md:py-8 animate-in fade-in slide-in-bottom-4 duration-500">
      
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-50 mb-3 border border-brand-100">
          <QrCode size={32} className="text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-default)]">{t("scanner.title")}</h1>
        <p className="text-[var(--text-subtle)] mt-1 max-w-sm mx-auto">{t("scanner.subtitle")}</p>
      </div>

      {/* Main Scanner Container */}
      <div className="bg-[var(--surface)] p-3 shadow-md border border-[var(--border)] max-w-[400px] mx-auto">
        <div className="relative bg-black overflow-hidden aspect-square w-full ring-1 ring-white/10">
          
          {/* Cool Tech Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

          {/* Reader element is always mounted but hidden when idle, so Html5Qrcode can attach */}
          <div id="qr-reader" className={cn("w-full h-full relative z-10", !showReader && "hidden")} />

          {/* Idle overlay — ask user to tap to start */}
          {state === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="text-center p-6 bg-black/40 backdrop-blur-sm rounded-none border border-white/5">
                <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-brand-500 relative">
                  <div className="absolute inset-0 animate-ping opacity-20 border border-brand-500"></div>
                  <Camera size={28} />
                </div>
                <p className="text-xs text-brand-400 font-bold uppercase tracking-widest">{t("scanner.tapToStart")}</p>
              </div>
            </div>
          )}

          {/* Starting spinner */}
          {state === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Scanning overlay */}
          {state === "scanning" && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
              <div className="relative w-[240px] h-[240px]">
                {/* Tech Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-brand-400" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-brand-400" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-brand-400" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-brand-400" />
                
                {/* Crosshair Center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
                  <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20" />
                  <div className="absolute left-1/2 top-0 w-[1px] h-full bg-white/20" />
                </div>

                {/* Laser Line */}
                <div className="absolute left-0 right-0 h-[2px] bg-brand-500 shadow-[0_0_12px_2px_rgba(var(--brand-500),0.8)] animate-scan-line" />
              </div>
            </div>
          )}

          {/* Result overlay */}
          {(state === "found" || state === "not-found" || state === "error") && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-dark/95">
              {state === "found" && assetInfo && (
                <div className="text-center p-6">
                  <div className="w-12 h-12 bg-green-500/10 flex items-center justify-center mx-auto mb-3 border border-green-500/20">
                    <ScanLine size={24} className="text-green-400" />
                  </div>
                  <p className="text-sm font-bold text-green-400 mb-1">{t("scanner.found")}</p>
                  <p className="text-lg font-bold mb-1" style={{ color: "var(--text-default)" }}>{assetInfo.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{assetInfo.code}</p>
                </div>
              )}

              {state === "not-found" && (
                <div className="text-center p-6">
                  <div className="w-12 h-12 bg-red-500/10 flex items-center justify-center mx-auto mb-3 border border-red-500/20">
                    <Search size={24} className="text-red-400" />
                  </div>
                  <p className="text-sm font-bold text-red-400 mb-1">{t("scanner.notFound")}</p>
                  <p className="text-xs text-gray-400">{scannedCode}</p>
                </div>
              )}

              {state === "error" && (
                <div className="text-center p-6 animate-in fade-in">
                  <div className="w-12 h-12 bg-yellow-500/10 flex items-center justify-center mx-auto mb-3 border border-yellow-500/20">
                    <CameraOff size={24} className="text-yellow-400" />
                  </div>
                  <p className="text-sm font-bold text-yellow-400 mb-1">{t("scanner.cameraError")}</p>
                  <p className="text-xs text-gray-400">{t("scanner.permissionMsg")}</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2 mt-4 px-1 pb-1">
          {state === "idle" && (
            <button onClick={startScanner} className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold transition-colors flex items-center justify-center gap-2">
              <Camera size={18} />
              {t("scanner.startScan")}
            </button>
          )}

          {(state === "scanning" || state === "starting") && (
            <button
              onClick={handleStopClick}
              disabled={state === "starting"}
              className="flex-1 py-3 bg-[var(--surface-hover)] text-red-500 hover:bg-red-50 hover:text-red-600 font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 border border-[var(--border)]"
            >
              <CameraOff size={18} />
              {t("scanner.stopScan")}
            </button>
          )}

          {(state === "found" || state === "not-found" || state === "error") && (
            <>
              <button onClick={resetScan} className="flex-1 py-3 bg-[var(--surface-hover)] text-[var(--text-default)] hover:bg-gray-100 font-bold transition-colors flex items-center justify-center gap-2 border border-[var(--border)]">
                <RotateCcw size={16} />
                {t("scanner.scanAgain")}
              </button>
              {state === "found" && assetInfo && (
                <button
                  onClick={() => router.push(`/assets/${assetInfo.id}?from=${encodeURIComponent("/scan")}`)}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink size={16} />
                  {t("scanner.openAsset")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
