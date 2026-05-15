// Path: src/components/AISmartSearch.tsx
"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AISmartSearchProps {
    onResults: (query: string) => void;
} 

export function AISmartSearch({ onResults }: AISmartSearchProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const { locale } = useI18n();

  const search = useCallback(async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setAnswer("");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `User is searching for equipment. Their query: "${query}".
Based on the equipment database, list the matching equipment codes and names.
If it's a question, answer it briefly. Keep response under 200 characters.`,
            },
          ],
          locale,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setAnswer(data.message);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [query, loading, locale]);

  const placeholder =
    locale === "th" ? 'AI ค้นหา เช่น "โน้ตบุ๊กที่ประกันหมดเร็วๆนี้"' :
    locale === "ja" ? 'AI検索 例: "保証期限が近いノートPC"' :
    'AI search e.g. "laptops with warranty expiring soon"';

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-surface-dark border border-border rounded-xl px-3 py-2">
        <Sparkles size={14} className="text-brand-500 flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm placeholder:text-gray-600 outline-none" style={{ color: "var(--text-default)" }}
        />
        <button
          onClick={search}
          disabled={!query.trim() || loading}
          className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-500 disabled:opacity-30 hover:bg-brand-500/30 transition"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
        </button>
      </div>

      {answer && (
        <div className="mt-2 bg-surface border border-border rounded-lg px-3 py-2 text-sm animate-in slide-in-from-bottom-4" style={{ color: "var(--text-muted)" }}>
          <div className="flex items-start gap-2">
            <Sparkles size={12} className="text-brand-500 mt-0.5 flex-shrink-0" />
            <p className="whitespace-pre-wrap leading-relaxed">{answer}</p>
          </div>
        </div>
      )}
    </div>
  );
}
