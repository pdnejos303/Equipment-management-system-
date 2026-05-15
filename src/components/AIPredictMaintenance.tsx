// Path: src/components/AIPredictMaintenance.tsx
"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, AlertTriangle, Clock, CheckCircle, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn, formatMoney } from "@/lib/utils";

interface Prediction {
  assetCode: string;
  assetName: string;
  predictedDate: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  estimatedCost: number;
  type: string;
  priority: "urgent" | "soon" | "planned";
}

const PRIORITY_STYLES: Record<string, { border: string; bg: string; text: string; icon: any }> = {
  urgent: { border: "border-red-500/20", bg: "bg-red-500/5", text: "text-red-400", icon: AlertTriangle },
  soon: { border: "border-amber-500/20", bg: "bg-amber-500/5", text: "text-amber-400", icon: Clock },
  planned: { border: "border-blue-500/20", bg: "bg-blue-500/5", text: "text-blue-400", icon: CheckCircle },
};

const CONFIDENCE_DOTS: Record<string, string> = {
  high: "bg-green-500",
  medium: "bg-yellow-500",
  low: "bg-gray-500",
};

const CACHE_KEY = "ai_predictions";

function loadFromStorage(locale: string): Prediction[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.locale !== locale) return null;
    return parsed.predictions;
  } catch {
    return null;
  }
}

function saveToStorage(locale: string, predictions: Prediction[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ locale, predictions, ts: Date.now() }));
  } catch { /* quota exceeded */ }
}

export function AIPredictMaintenance() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { t, locale } = useI18n();

  // Load from localStorage on mount
  useEffect(() => {
    const cached = loadFromStorage(locale);
    if (cached && cached.length > 0) {
      setPredictions(cached);
      setLoaded(true);
    }
  }, [locale]);

  const fetchPredictions = async (force: boolean) => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/predict-maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, force }),
      });
      const data = await res.json();
      if (data.predictions) {
        setPredictions(data.predictions);
        setLoaded(true);
        saveToStorage(locale, data.predictions);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const title =
    locale === "th" ? "AI ทำนายการบำรุงรักษา" :
    locale === "ja" ? "AIメンテナンス予測" :
    "AI Maintenance Predictions";

  const btnText =
    locale === "th" ? "วิเคราะห์ด้วย AI" :
    locale === "ja" ? "AI分析" :
    "Analyze with AI";

  if (!loaded && !loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-brand-500" />
          <h2 className="font-semibold" style={{ color: "var(--text-default)" }}>{title}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {locale === "th"
            ? "AI จะวิเคราะห์ประวัติซ่อมบำรุงและทำนายว่าอุปกรณ์ไหนต้องซ่อมเร็วๆนี้"
            : locale === "ja"
              ? "AIがメンテナンス履歴を分析し、近日中にメンテナンスが必要な機器を予測します"
              : "AI will analyze maintenance history and predict which equipment needs service soon"}
        </p>
        <button onClick={() => fetchPredictions(false)} className="btn-primary w-full flex items-center justify-center gap-2">
          <Sparkles size={14} />
          {btnText}
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-brand-500" />
          <h2 className="font-semibold" style={{ color: "var(--text-default)" }}>{title}</h2>
          {loaded && !loading && (
            <span className="text-[10px] text-gray-600 bg-surface-dark px-1.5 py-0.5 rounded">
              cached
            </span>
          )}
        </div>
        <button
          onClick={() => fetchPredictions(true)}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-brand-500 hover:underline disabled:opacity-50"
        >
          <RefreshCw size={12} className={cn(loading && "animate-spin")} />
          {locale === "th" ? "เจนใหม่" : locale === "ja" ? "再生成" : "Regenerate"}
        </button>
      </div>

      {loading && !loaded ? (
        <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">
            {locale === "th" ? "AI กำลังวิเคราะห์..." : locale === "ja" ? "AI分析中..." : "AI analyzing..."}
          </span>
        </div>
      ) : predictions.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          {locale === "th" ? "ไม่พบการทำนาย" : locale === "ja" ? "予測なし" : "No predictions"}
        </p>
      ) : (
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Loader2 size={12} className="animate-spin" />
              {locale === "th" ? "กำลังเจนใหม่..." : "Regenerating..."}
            </div>
          )}
          {predictions.map((pred, i) => {
            const style = PRIORITY_STYLES[pred.priority] || PRIORITY_STYLES.planned;
            const PriorityIcon = style.icon;
            return (
              <div key={i} className={cn("border rounded-lg px-3 py-2.5", style.border, style.bg)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <PriorityIcon size={14} className={cn("mt-0.5 flex-shrink-0", style.text)} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-brand-500">{pred.assetCode}</span>
                        <span className="text-sm truncate" style={{ color: "var(--text-default)" }}>{pred.assetName}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{pred.reason}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-gray-500">{pred.predictedDate}</span>
                        <span className="text-[10px] text-gray-500">{t(`maintType.${pred.type}`)}</span>
                        <span className="text-[10px] font-mono text-brand-500">
                          ~{t("common.baht")}{formatMoney(pred.estimatedCost, locale)}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                          <span className={cn("w-1.5 h-1.5 rounded-full", CONFIDENCE_DOTS[pred.confidence])} />
                          {pred.confidence}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
