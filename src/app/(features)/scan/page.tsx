// Path: src/app/(features)/scan/page.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, Camera, CameraOff, Search, ExternalLink, RotateCcw } from "lucide-react";
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
  const [manualCode, setManualCode] = useState("");

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

  const handleManualSearch = () => {
    if (!manualCode.trim()) return;
    setScannedCode(manualCode.trim());
    lookupAsset(manualCode.trim());
  };

  const showReader = state === "scanning" || state === "starting";

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold">{t("scanner.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("scanner.subtitle")}</p>
      </div>

      {/* Scanner viewport */}
      <div className="card overflow-hidden">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-square max-h-[320px]">
          {/* Reader element is always mounted but hidden when idle, so Html5Qrcode can attach */}
          <div id="qr-reader" className={cn("w-full h-full", !showReader && "hidden")} />

          {/* Idle overlay — ask user to tap to start */}
          {state === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-6 animate-in fade-in">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/15 flex items-center justify-center mx-auto mb-3">
                  <Camera size={24} className="text-brand-500" />
                </div>
                <p className="text-xs text-gray-500">{t("scanner.tapToStart")}</p>
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
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[200px] h-[200px]">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-brand-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-brand-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-brand-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-brand-500 rounded-br-lg" />
                <div className="absolute left-2 right-2 h-0.5 bg-brand-500/80 animate-scan-line" />
              </div>
            </div>
          )}

          {/* Result overlay */}
          {(state === "found" || state === "not-found" || state === "error") && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-dark/95">
              {state === "found" && assetInfo && (
                <div className="text-center p-6 animate-in fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto mb-3">
                    <ScanLine size={24} className="text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-green-400 mb-1">{t("scanner.found")}</p>
                  <p className="text-lg font-bold mb-1" style={{ color: "var(--text-default)" }}>{assetInfo.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{assetInfo.code}</p>
                </div>
              )}

              {state === "not-found" && (
                <div className="text-center p-6 animate-in fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-3">
                    <Search size={24} className="text-red-400" />
                  </div>
                  <p className="text-sm font-semibold text-red-400 mb-1">{t("scanner.notFound")}</p>
                  <p className="text-xs text-gray-500">{scannedCode}</p>
                </div>
              )}

              {state === "error" && (
                <div className="text-center p-6 animate-in fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-yellow-500/15 flex items-center justify-center mx-auto mb-3">
                    <CameraOff size={24} className="text-yellow-400" />
                  </div>
                  <p className="text-sm font-semibold text-yellow-400 mb-1">{t("scanner.cameraError")}</p>
                  <p className="text-xs text-gray-500">{t("scanner.permissionMsg")}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4 px-1">
          {state === "idle" && (
            <button onClick={startScanner} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Camera size={14} />
              {t("scanner.startScan")}
            </button>
          )}

          {(state === "scanning" || state === "starting") && (
            <button
              onClick={handleStopClick}
              disabled={state === "starting"}
              className="btn-ghost flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CameraOff size={14} />
              {t("scanner.stopScan")}
            </button>
          )}

          {(state === "found" || state === "not-found" || state === "error") && (
            <>
              <button onClick={resetScan} className="btn-ghost flex-1 flex items-center justify-center gap-2">
                <RotateCcw size={14} />
                {t("scanner.scanAgain")}
              </button>
              {state === "found" && assetInfo && (
                <button
                  onClick={() => router.push(`/assets/${assetInfo.id}?from=${encodeURIComponent("/scan")}`)}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <ExternalLink size={14} />
                  {t("scanner.openAsset")}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Manual code input */}
      <div className="card mt-4">
        <p className="text-xs text-gray-500 font-semibold mb-2">{t("scanner.orEnterCode")}</p>
        <div className="flex gap-2">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
            placeholder={t("scanner.searchPlaceholder")}
            className="input flex-1"
          />
          <button onClick={handleManualSearch} disabled={!manualCode.trim()} className="btn-primary px-4">
            <Search size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
