// Path: src/components/AIAssetAnalysis.tsx
"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, Heart, Shield, Wrench, TrendingDown, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Analysis {
  healthScore: number;
  recommendation: "keep" | "repair" | "replace" | "retire";
  summary: string;
  costAnalysis: {
    repairRatio: number;
    projectedAnnualCost: number;
    replacementROI: string;
  };
  maintenanceInsights: string[];
  riskFactors: string[];
  actionItems: string[];
}

const RECOMMENDATION_STYLES: Record<string, { bg: string; text: string; label: Record<string, string> }> = {
  keep: { bg: "bg-green-500/10", text: "text-green-400", label: { th: "ใช้ต่อ", en: "Keep", ja: "継続使用" } },
  repair: { bg: "bg-amber-500/10", text: "text-amber-400", label: { th: "ซ่อม", en: "Repair", ja: "修理" } },
  replace: { bg: "bg-red-500/10", text: "text-red-400", label: { th: "เปลี่ยนใหม่", en: "Replace", ja: "交換" } },
  retire: { bg: "bg-gray-500/10", text: "text-gray-400", label: { th: "ปลดระวาง", en: "Retire", ja: "廃棄" } },
};

const CACHE_PREFIX = "ai_analyze_";

function loadFromStorage(assetId: string, locale: string): Analysis | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + assetId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.locale !== locale) return null;
    return parsed.analysis;
  } catch {
    return null;
  }
}

function saveToStorage(assetId: string, locale: string, analysis: Analysis) {
  try {
    localStorage.setItem(CACHE_PREFIX + assetId, JSON.stringify({ locale, analysis, ts: Date.now() }));
  } catch { /* quota exceeded */ }
}

export function AIAssetAnalysis({ assetId }: { assetId: string }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { locale } = useI18n();

  // Load from localStorage on mount
  useEffect(() => {
    const cached = loadFromStorage(assetId, locale);
    if (cached) {
      setAnalysis(cached);
      setLoaded(true);
    }
  }, [assetId, locale]);

  const fetchAnalysis = async (force: boolean) => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, locale, force }),
      });
      const data = await res.json();
      if (data.healthScore !== undefined) {
        setAnalysis(data);
        setLoaded(true);
        saveToStorage(assetId, locale, data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const title =
    locale === "th" ? "AI วิเคราะห์อุปกรณ์" :
    locale === "ja" ? "AI機器分析" :
    "AI Equipment Analysis";

  const btnText =
    locale === "th" ? "วิเคราะห์ด้วย AI" :
    locale === "ja" ? "AI分析" :
    "Analyze with AI";

  if (!analysis && !loading) {
    return (
      <button
        onClick={() => fetchAnalysis(false)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-brand-500/8 border border-brand-500/15 rounded-xl text-brand-500 hover:border-brand-500/30 transition text-sm font-medium"
      >
        <Sparkles size={16} />
        {btnText}
      </button>
    );
  }

  if (loading && !analysis) {
    return (
      <div className="flex items-center justify-center py-6 gap-2 text-gray-500 bg-surface-dark rounded-xl">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">
          {locale === "th" ? "AI กำลังวิเคราะห์..." : locale === "ja" ? "AI分析中..." : "AI analyzing..."}
        </span>
      </div>
    );
  }

  if (!analysis) return null;

  const recStyle = RECOMMENDATION_STYLES[analysis.recommendation] || RECOMMENDATION_STYLES.keep;
  const healthColor =
    analysis.healthScore >= 70 ? "text-green-400" :
    analysis.healthScore >= 40 ? "text-amber-400" :
    "text-red-400";

  const healthBg =
    analysis.healthScore >= 70 ? "bg-green-500" :
    analysis.healthScore >= 40 ? "bg-amber-500" :
    "bg-red-500";

  return (
    <div className="bg-surface-dark rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-brand-500/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-brand-500" />
          <span className="text-sm font-semibold" style={{ color: "var(--text-default)" }}>{title}</span>
          {loaded && !loading && (
            <span className="text-[10px] text-gray-600 bg-surface-dark px-1.5 py-0.5 rounded">
              cached
            </span>
          )}
        </div>
        <button
          onClick={() => fetchAnalysis(true)}
          disabled={loading}
          className="flex items-center gap-1 text-[10px] text-brand-500 hover:underline disabled:opacity-50"
        >
          <RefreshCw size={10} className={cn(loading && "animate-spin")} />
          {locale === "th" ? "เจนใหม่" : locale === "ja" ? "再生成" : "Regenerate"}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 size={12} className="animate-spin" />
            {locale === "th" ? "กำลังเจนใหม่..." : "Regenerating..."}
          </div>
        )}

        {/* Health Score & Recommendation */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={cn("text-3xl font-bold", healthColor)}>{analysis.healthScore}</div>
            <div className="text-[10px] text-gray-500 uppercase">
              {locale === "th" ? "คะแนนสุขภาพ" : locale === "ja" ? "健康スコア" : "Health"}
            </div>
          </div>
          <div className="flex-1">
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", healthBg)} style={{ width: `${analysis.healthScore}%` }} />
            </div>
          </div>
          <div className={cn("px-3 py-1.5 rounded-lg text-xs font-bold", recStyle.bg, recStyle.text)}>
            {recStyle.label[locale] || recStyle.label.en}
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{analysis.summary}</p>

        {/* Action Items */}
        {analysis.actionItems?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
              <Wrench size={12} />
              {locale === "th" ? "สิ่งที่ควรทำ" : locale === "ja" ? "アクション" : "Action Items"}
            </h4>
            <div className="space-y-1">
              {analysis.actionItems.map((item, i) => (
                <div key={i} className="text-xs text-gray-400 flex items-start gap-2">
                  <span className="text-brand-500 mt-0.5">&#x2022;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Factors */}
        {analysis.riskFactors?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
              <Shield size={12} />
              {locale === "th" ? "ความเสี่ยง" : locale === "ja" ? "リスク" : "Risk Factors"}
            </h4>
            <div className="space-y-1">
              {analysis.riskFactors.map((risk, i) => (
                <div key={i} className="text-xs text-amber-400/80 flex items-start gap-2">
                  <span className="mt-0.5">&#x26A0;</span>
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Maintenance Insights */}
        {analysis.maintenanceInsights?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
              <TrendingDown size={12} />
              {locale === "th" ? "วิเคราะห์การบำรุงรักษา" : locale === "ja" ? "メンテナンス分析" : "Maintenance Insights"}
            </h4>
            <div className="space-y-1">
              {analysis.maintenanceInsights.map((insight, i) => (
                <div key={i} className="text-xs text-gray-400 flex items-start gap-2">
                  <Heart size={10} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
