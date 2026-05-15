// Path: src/components/AIInsights.tsx
"use client";

import { useState, useEffect } from "react";
import { Sparkles, AlertTriangle, TrendingUp, PiggyBank, Clock, Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Insight {
  icon: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
}

const ICON_MAP: Record<string, any> = {
  warning: AlertTriangle,
  trending_up: TrendingUp,
  savings: PiggyBank,
  schedule: Clock,
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "border-blue-500/20 bg-blue-500/5",
  warning: "border-amber-500/20 bg-amber-500/5",
  critical: "border-red-500/20 bg-red-500/5",
};

const SEVERITY_ICON_COLOR: Record<string, string> = {
  info: "text-blue-400",
  warning: "text-amber-400",
  critical: "text-red-400",
};

const CACHE_KEY = "ai_insights";

function loadFromStorage(locale: string): Insight[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.locale !== locale) return null;
    return parsed.insights;
  } catch {
    return null;
  }
}

function saveToStorage(locale: string, insights: Insight[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ locale, insights, ts: Date.now() }));
  } catch { /* quota exceeded */ }
}

export function AIInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { locale } = useI18n();

  // Load from localStorage on mount
  useEffect(() => {
    const cached = loadFromStorage(locale);
    if (cached && cached.length > 0) {
      setInsights(cached);
      setLoaded(true);
    } else {
      fetchInsights(false);
    }
  }, [locale]);

  const fetchInsights = async (force: boolean) => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, force }),
      });
      const data = await res.json();
      if (data.insights) {
        setInsights(data.insights);
        setLoaded(true);
        saveToStorage(locale, data.insights);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const title =
    locale === "th" ? "AI วิเคราะห์" :
    locale === "ja" ? "AI分析" :
    "AI Insights";

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center">
            <Sparkles size={14} className="text-brand-500" />
          </div>
          <h2 className="font-semibold" style={{ color: "var(--text-default)" }}>{title}</h2>
          {loaded && !loading && (
            <span className="text-[10px] text-gray-600 bg-surface-dark px-1.5 py-0.5 rounded">
              cached
            </span>
          )}
        </div>
        <button
          onClick={() => fetchInsights(true)}
          disabled={loading}
          className="text-gray-500 hover:text-brand-500 transition"
          title={locale === "th" ? "เจนใหม่" : "Regenerate"}
        >
          <RefreshCw size={14} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      {loading && !loaded ? (
        <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">
            {locale === "th" ? "AI กำลังวิเคราะห์..." : locale === "ja" ? "AI分析中..." : "AI analyzing..."}
          </span>
        </div>
      ) : insights.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          {locale === "th" ? "ไม่มีข้อมูลเพียงพอ" : locale === "ja" ? "十分なデータがありません" : "Not enough data"}
        </p>
      ) : (
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Loader2 size={12} className="animate-spin" />
              {locale === "th" ? "กำลังเจนใหม่..." : "Regenerating..."}
            </div>
          )}
          {insights.map((insight, i) => {
            const IconComponent = ICON_MAP[insight.icon] || Sparkles;
            return (
              <div
                key={i}
                className={cn(
                  "border rounded-lg px-3 py-2.5 transition-all hover:scale-[1.01]",
                  SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info
                )}
              >
                <div className="flex items-start gap-2.5">
                  <IconComponent
                    size={16}
                    className={cn("mt-0.5 flex-shrink-0", SEVERITY_ICON_COLOR[insight.severity] || "text-blue-400")}
                  />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-default)" }}>{insight.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{insight.description}</p>
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
