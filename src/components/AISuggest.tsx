// Path: src/components/AISuggest.tsx
"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AISuggestCategoryProps {
  name: string;
  brand: string;
  model: string;
  onSuggest: (category: string) => void;
}

export function AISuggestCategory({ name, brand, model, onSuggest }: AISuggestCategoryProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{ category: string; confidence: number } | null>(null);
  const { locale } = useI18n();

  const suggest = useCallback(async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", data: { name, brand, model }, locale }),
      });
      const data = await res.json();
      if (data.category) {
        setSuggestion(data);
        onSuggest(data.category);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [name, brand, model, locale, onSuggest]);

  return (
    <button
      type="button"
      onClick={suggest}
      disabled={loading || !name.trim()}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition",
        suggestion
          ? "bg-green-500/10 text-green-400 border border-green-500/20"
          : "bg-brand-500/10 text-brand-500 border border-brand-500/20 hover:bg-brand-500/20"
      )}
      title={locale === "th" ? "AI แนะนำประเภท" : locale === "ja" ? "AIカテゴリ提案" : "AI suggest category"}
    >
      {loading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
      {suggestion
        ? `${Math.round(suggestion.confidence * 100)}%`
        : "AI"}
    </button>
  );
}

interface AISuggestLifespanProps {
  name: string;
  category: string;
  brand: string;
  onSuggest: (years: string) => void;
}

export function AISuggestLifespan({ name, category, brand, onSuggest }: AISuggestLifespanProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const { locale } = useI18n();

  const suggest = useCallback(async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "lifespan", data: { name, category, brand }, locale }),
      });
      const data = await res.json();
      if (data.years) {
        onSuggest(String(data.years));
        setReason(data.reason || "");
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [name, category, brand, locale, onSuggest]);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={suggest}
        disabled={loading || !name.trim()}
        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20 hover:bg-brand-500/20 transition"
        title={reason || (locale === "th" ? "AI แนะนำอายุการใช้งาน" : "AI suggest lifespan")}
      >
        {loading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
        AI
      </button>
      {reason && <span className="text-[10px] text-gray-500 max-w-[200px] truncate">{reason}</span>}
    </div>
  );
}

interface AISuggestNotesProps {
  name: string;
  category: string;
  brand: string;
  model: string;
  onSuggest: (notes: string) => void;
}

export function AISuggestNotes({ name, category, brand, model, onSuggest }: AISuggestNotesProps) {
  const [loading, setLoading] = useState(false);
  const { locale } = useI18n();

  const suggest = useCallback(async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "notes", data: { name, category, brand, model }, locale }),
      });
      const data = await res.json();
      if (data.notes) {
        onSuggest(data.notes);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [name, category, brand, model, locale, onSuggest]);

  return (
    <button
      type="button"
      onClick={suggest}
      disabled={loading || !name.trim()}
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20 hover:bg-brand-500/20 transition"
      title={locale === "th" ? "AI สร้างหมายเหตุ" : "AI generate notes"}
    >
      {loading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
      AI
    </button>
  );
}

interface AISuggestMaintenanceProps {
  assetName: string;
  category: string;
  type: string;
  lastMaintenance?: string;
  onSuggest: (description: string, cost: string) => void;
}

export function AISuggestMaintenance({ assetName, category, type, lastMaintenance, onSuggest }: AISuggestMaintenanceProps) {
  const [loading, setLoading] = useState(false);
  const { locale } = useI18n();

  const suggest = useCallback(async () => {
    if (!assetName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "maintenance_description",
          data: { assetName, category, type, lastMaintenance },
          locale,
        }),
      });
      const data = await res.json();
      if (data.description) {
        onSuggest(data.description, data.estimatedCost ? String(data.estimatedCost) : "");
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [assetName, category, type, lastMaintenance, locale, onSuggest]);

  return (
    <button
      type="button"
      onClick={suggest}
      disabled={loading || !assetName.trim()}
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20 hover:bg-brand-500/20 transition"
      title={locale === "th" ? "AI แนะนำรายละเอียด" : "AI suggest description"}
    >
      {loading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
      AI
    </button>
  );
}
