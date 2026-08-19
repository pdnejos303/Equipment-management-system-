"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";

export function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // ซ่อนปุ่มถ้าแอปถูกติดตั้งไปแล้ว (เปิดแบบเต็มจออยู่)
  if (isStandalone) return null;

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSPrompt(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      // สำหรับบนคอมพิวเตอร์ หรือเบราว์เซอร์ที่ไม่รองรับ
      alert("กรุณาเปิดจากโทรศัพท์มือถือ หรือเลือก 'ติดตั้งแอป / Add to Home Screen' จากเมนูของเบราว์เซอร์");
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-2 w-full justify-center mt-4 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-default)] py-3 rounded-xl font-bold shadow-sm transition-all"
      >
        <Download size={18} className="text-brand-500" />
        โหลดแอปสำหรับโทรศัพท์
      </button>

      {showIOSPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--surface)] text-[var(--text-default)] p-6 rounded-2xl shadow-xl max-w-sm w-full relative">
            <button 
              onClick={() => setShowIOSPrompt(false)}
              className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--text-default)]"
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-2">ติดตั้งแอปบน iOS</h3>
            <p className="text-sm mb-4 leading-relaxed text-[var(--text-muted)]">
              1. แตะไอคอน <span className="font-bold text-blue-500">แชร์ (Share)</span> ที่แถบเมนูด้านล่าง<br/>
              2. เลื่อนลงและเลือก <span className="font-bold">"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</span><br/>
              3. แตะ <span className="font-bold text-blue-500">"เพิ่ม" (Add)</span>
            </p>
            <button 
              onClick={() => setShowIOSPrompt(false)}
              className="w-full bg-[var(--surface-hover)] border border-[var(--border)] py-2.5 rounded-lg font-semibold"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </>
  );
}
